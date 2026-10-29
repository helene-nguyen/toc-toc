//~ The live chart: the trace scrolls with time, and can be explored.
// - one finger drags through the past, two fingers pinch to zoom around
//   them; on a computer, Ctrl + wheel zooms and a horizontal scroll pans
// - − / + halve or double the zoom, "Toute la session" fits it on screen
// - "Direct" comes back to now; zooming without leaving now keeps following
// The view lives in a ref and the canvas redraws every animation frame from
// getTimeline(), so the trace moves smoothly without re-rendering React.
import { useEffect, useRef, useState } from 'react';
import type { Timeline } from '../domain/timeline';
import { drawChart, GUTTER, readPalette, type ChartMode } from '../chart/drawChart';
import { clockAt, span } from '../format';

// px per minute: the default shows ~6 minutes on a phone, like the paper
const DEFAULT_PPM = 54;
// the strongest zoom: ~2 minutes on a phone, to see a contraction's shape
const ZOOM_MAX = 240;

interface TocoChartProps {
  getTimeline: () => Timeline | null;
  startedAt: string;
  mode: ChartMode;
  // open on the whole session rather than on now
  fitAtStart?: boolean;
}

interface ChartActions {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  live: () => void;
  scrub: (viewEnd: number) => void;
}

const noop = () => {};

interface Hud {
  window: string;
  fit: boolean;
  follow: boolean;
  min: number;
  max: number;
  value: number;
}

export const TocoChart = ({ getTimeline, startedAt, mode, fitAtStart = false }: TocoChartProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const props = useRef({ getTimeline, startedAt, mode });
  props.current = { getTimeline, startedAt, mode };
  const actions = useRef<ChartActions>({ zoomIn: noop, zoomOut: noop, fit: noop, live: noop, scrub: noop });
  const [hud, setHud] = useState<Hud>({ window: '', fit: fitAtStart, follow: true, min: 0, max: 0, value: 0 });

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const view = { ppm: DEFAULT_PPM, fit: fitAtStart, follow: true, viewEnd: 0, w: 0, h: 0 };
    let palette = readPalette();

    const timeline = () => props.current.getTimeline();
    const sessionSpan = (tl: Timeline) => Math.max(tl.now * (tl.running ? 1.07 : 1), 600);
    const fitPpm = (tl: Timeline) => (view.w - GUTTER) / (sessionSpan(tl) / 60);
    const win = () => ((view.w - GUTTER) / view.ppm) * 60;
    const maxEnd = (tl: Timeline) => Math.max(tl.now + (tl.running ? win() * 0.06 : 0), win());

    // zoom around a point of the screen (px), which stays under the fingers;
    // without a point, keep the right edge (and keep following now)
    const zoomTo = (ppm: number, anchor?: number) => {
      const tl = timeline();
      if (!tl) return;
      const minPpm = fitPpm(tl);
      const ax = anchor ?? view.w;
      const tAnchor = view.viewEnd - win() + ((ax - GUTTER) / view.ppm) * 60;
      view.fit = false;
      view.ppm = Math.min(ZOOM_MAX, Math.max(minPpm, ppm));
      if (view.ppm <= minPpm + 0.01) {
        view.fit = true;
        view.follow = true;
        return;
      }
      if (anchor === undefined && view.follow) return;
      view.viewEnd = tAnchor - ((ax - GUTTER) / view.ppm) * 60 + win();
      view.follow = view.viewEnd >= maxEnd(tl) - 1;
    };

    actions.current = {
      zoomIn: () => zoomTo(view.ppm * 2),
      zoomOut: () => zoomTo(view.ppm / 2),
      fit: () => {
        view.fit = true;
        view.follow = true;
      },
      live: () => {
        view.follow = true;
      },
      scrub: (value) => {
        const tl = timeline();
        if (!tl) return;
        view.viewEnd = value;
        view.follow = value >= maxEnd(tl) - 1;
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view.w = wrap.clientWidth;
      view.h = wrap.clientHeight;
      canvas.width = view.w * dpr;
      canvas.height = view.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    // pointers: one drags, two pinch
    const pointers = new Map<number, number>();
    let drag: { x: number; end: number } | null = null;
    let pinch: { distance: number; ppm: number } | null = null;
    const localX = (clientX: number) => clientX - wrap.getBoundingClientRect().left;
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return { distance: Math.abs(a - b) || 1, middle: localX((a + b) / 2) };
    };
    const onDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;
      pointers.set(event.pointerId, event.clientX);
      if (pointers.size === 2) {
        pinch = { distance: spread().distance, ppm: view.ppm };
        drag = null;
      } else if (pointers.size === 1) {
        drag = { x: event.clientX, end: view.viewEnd };
      }
    };
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, event.clientX);
      if (pinch && pointers.size === 2) {
        const { distance, middle } = spread();
        zoomTo(pinch.ppm * (distance / pinch.distance), middle);
        return;
      }
      const tl = timeline();
      if (!drag || !tl || Math.abs(event.clientX - drag.x) < 4) return;
      view.follow = false;
      view.viewEnd = drag.end - ((event.clientX - drag.x) / view.ppm) * 60;
      if (view.viewEnd >= maxEnd(tl) - 1) view.follow = true;
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) drag = null;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        zoomTo(view.ppm * Math.exp(-event.deltaY * 0.01), localX(event.clientX));
      } else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();
        view.follow = false;
        view.viewEnd += (event.deltaX / view.ppm) * 60;
      }
    };
    const onDoubleClick = (event: MouseEvent) => zoomTo(view.ppm * 2, localX(event.clientX));
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) wrap.addEventListener(type, onUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('dblclick', onDoubleClick);

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => (palette = readPalette());
    scheme.addEventListener('change', onScheme);

    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const tl = timeline();
      if (!tl || !view.w) return;
      if (view.fit) view.ppm = fitPpm(tl);
      const w = win();
      if (view.follow) view.viewEnd = maxEnd(tl);
      view.viewEnd = Math.min(Math.max(view.viewEnd, w), maxEnd(tl));
      drawChart(ctx, view.w, view.h, tl, view.viewEnd - w, view.viewEnd, palette, props.current.mode, {
        clock: (seconds) => clockAt(props.current.startedAt, seconds),
        showNow: true
      });
    };
    frame = requestAnimationFrame(draw);

    // the controls under the chart only need a few refreshes a second
    const hudTimer = window.setInterval(() => {
      const tl = timeline();
      if (!tl) return;
      // keep the fitted zoom current even while no frame is drawn (tab in the background)
      if (view.fit && view.w) view.ppm = fitPpm(tl);
      setHud({
        window: span(win()),
        fit: view.fit,
        follow: view.follow,
        min: Math.floor(win()),
        max: Math.ceil(maxEnd(tl)),
        value: view.viewEnd
      });
    }, 250);

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(hudTimer);
      observer.disconnect();
      scheme.removeEventListener('change', onScheme);
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) wrap.removeEventListener(type, onUp);
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('dblclick', onDoubleClick);
    };
  }, [fitAtStart]);

  return (
    <div className="toco-chart">
      <div ref={wrapRef} className={`toco-chart__paper toco-chart__paper--${mode}`}>
        <canvas ref={canvasRef} aria-label="Tracé des contractions" role="img" />
        {!hud.follow && (
          <button type="button" className="toco-chart__live" onClick={() => actions.current.live()}>
            Direct →
          </button>
        )}
      </div>
      <div className="toco-chart__controls">
        <span className="toco-chart__zoom">
          <button type="button" aria-label="Dézoomer" disabled={hud.fit} onClick={() => actions.current.zoomOut()}>
            −
          </button>
          <span className="toco-chart__window">{hud.window}</span>
          <button type="button" aria-label="Zoomer" onClick={() => actions.current.zoomIn()}>
            +
          </button>
          <button
            type="button"
            className="toco-chart__fit"
            aria-pressed={hud.fit}
            title="Afficher toute la session d'un coup d'œil"
            onClick={() => actions.current.fit()}
          >
            Toute la session
          </button>
        </span>
        <input
          type="range"
          className="toco-chart__scrub"
          aria-label="Parcourir le tracé"
          min={hud.min}
          max={hud.max}
          step={1}
          value={hud.value}
          disabled={hud.max <= hud.min + 1}
          onChange={(event) => actions.current.scrub(Number(event.target.value))}
        />
      </div>
    </div>
  );
};
