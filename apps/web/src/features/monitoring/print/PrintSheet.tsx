//~ The printed record: A4 landscape pages, laid out at their real size
// (1123 × 794 px is 297 × 210 mm) and shrunk to fit the screen for the
// preview. Printing shows them at full size, one per sheet (print.css).
// Always on white paper with the light palette, whatever the screen theme.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Monitoring } from '../monitoringTypes';
import type { Timeline } from '../domain/timeline';
import { sessionSummary, rhythm } from '../domain/stats';
import { drawChart, type ChartMode, type Palette } from '../chart/drawChart';
import { clockAt, hourMinSec, minSec, shortDate } from '../format';
import { curveLabel, painLabel } from '../feeling';
import { paginate, ROW_HEIGHT, type RowMinutes } from './paginate';
import './print.css';

const PAGE_WIDTH = 1123;
// the trace rows span the page between its 36 px margins
const ROW_WIDTH = PAGE_WIDTH - 72;

const PAPER: Palette = {
  paper: '#ffffff',
  'grid-minor': '#f3d9da',
  'grid-major': '#e2a6aa',
  trace: '#1c3c86',
  'contract-soft': 'rgba(207, 75, 66, 0.12)',
  muted: '#5b6677',
  move: '#0f7f73',
  'move-soft': 'rgba(15, 127, 115, 0.14)'
};


export interface PrintOptions {
  rowMinutes: RowMinutes;
  mode: ChartMode;
  journal: boolean;
  // a line for the header: name, maternity unit, remark
  notes: string;
}

interface PrintSheetProps {
  monitoring: Monitoring;
  timeline: Timeline;
  options: PrintOptions;
}

//~ One row of trace, drawn at print resolution
const TraceRow = ({ monitoring, timeline, from, to, mode }: {
  monitoring: Monitoring;
  timeline: Timeline;
  from: number;
  to: number;
  mode: ChartMode;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = ROW_HEIGHT[mode];

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = 3;
    canvas.width = ROW_WIDTH * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawChart(ctx, ROW_WIDTH, height, timeline, from, to, PAPER, mode, {
      clock: (seconds) => clockAt(monitoring.startedAt, seconds)
    });
  }, [monitoring.startedAt, timeline, from, to, mode, height]);

  return (
    <div>
      <div className="print-sheet__row-label">
        {clockAt(monitoring.startedAt, from)} – {clockAt(monitoring.startedAt, to)}
      </div>
      <canvas ref={ref} className="print-sheet__trace" style={{ height }} />
    </div>
  );
};

export const PrintSheet = ({ monitoring, timeline, options }: PrintSheetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const summary = sessionSummary(timeline);
  const recent = rhythm(timeline);
  const finished = timeline.contractions.filter((contraction) => contraction.end !== null);
  const rowSeconds = options.rowMinutes * 60;
  const pages = paginate({
    duration: timeline.now,
    rowMinutes: options.rowMinutes,
    mode: options.mode,
    journalLines: options.journal ? finished.length : 0
  });
  const notes = options.notes.trim();

  // shrink the real-size pages to the width available on screen
  useLayoutEffect(() => {
    const container = containerRef.current!;
    const fit = () => container.style.setProperty('--print-scale', String(Math.min(1, container.clientWidth / PAGE_WIDTH)));
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    fit();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="print-sheet">
      {pages.map((page, index) => (
        <div key={index} className="print-sheet__frame">
          <article className="print-sheet__page">
            {index === 0 ? (
              <>
                <header className="print-sheet__header">
                  <div>
                    <h1>Suivi des contractions</h1>
                    <p>
                      Tracé reconstruit à partir des saisies ·{' '}
                      {options.mode === 'split' ? 'mouvements du bébé en bande séparée' : '▼ = mouvement du bébé'} · 1
                      grand carreau = 1 min
                    </p>
                  </div>
                  <dl className="print-sheet__meta">
                    <div>
                      <dt>Date</dt>
                      <dd>{shortDate(monitoring.startedAt)}</dd>
                    </div>
                    <div>
                      <dt>Horaires</dt>
                      <dd>
                        {clockAt(monitoring.startedAt)} – {clockAt(monitoring.startedAt, timeline.now)}
                      </dd>
                    </div>
                    <div>
                      <dt>Durée</dt>
                      <dd>{hourMinSec(summary.duration)}</dd>
                    </div>
                    <div>
                      <dt>Contractions</dt>
                      <dd>
                        {summary.contractionCount}
                        {summary.braxtonHicksCount > 0 && ` (+ ${summary.braxtonHicksCount} sans douleur)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Intervalle moy.</dt>
                      <dd>{summary.averageInterval === null ? '–' : `${minSec(summary.averageInterval)} min`}</dd>
                    </div>
                    <div>
                      <dt>Durée moy.</dt>
                      <dd>{summary.averageDuration === null ? '–' : `${Math.round(summary.averageDuration)} s`}</dd>
                    </div>
                    <div>
                      <dt>Fréq. (10 dern. min)</dt>
                      <dd>{recent.perTenMinutes} / 10 min</dd>
                    </div>
                    <div>
                      <dt>Mouvements bébé</dt>
                      <dd>{summary.movementCount}</dd>
                    </div>
                  </dl>
                </header>
                {notes && <p className="print-sheet__notes">{notes}</p>}
              </>
            ) : (
              <div className="print-sheet__row-label">
                Suivi des contractions · {shortDate(monitoring.startedAt)} (suite)
              </div>
            )}

            {page.kind === 'trace' &&
              page.rows.map((row) => (
                <TraceRow
                  key={row}
                  monitoring={monitoring}
                  timeline={timeline}
                  from={row * rowSeconds}
                  to={(row + 1) * rowSeconds}
                  mode={options.mode}
                />
              ))}

            {page.kind === 'journal' && (
              <>
                <h2 className="print-sheet__section">Journal</h2>
                <table className="print-sheet__journal">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Début</th>
                      <th>Fin</th>
                      <th>Durée</th>
                      <th>Intervalle</th>
                      <th>Douleur</th>
                      <th>Intensité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finished.slice(page.from, page.to).map((contraction, offset) => {
                      const number = page.from + offset;
                      const previous = finished[number - 1];
                      return (
                        <tr key={number}>
                          <td>{number + 1}</td>
                          <td>{clockAt(monitoring.startedAt, contraction.start)}</td>
                          <td>{clockAt(monitoring.startedAt, contraction.end!)}</td>
                          <td>{Math.round(contraction.end! - contraction.start)} s</td>
                          <td>{previous ? minSec(contraction.start - previous.start) : '–'}</td>
                          <td>{painLabel(contraction)}</td>
                          <td>{curveLabel(contraction)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            <footer className="print-sheet__footer">
              <span>
                Document établi par Toc-Toc à partir des saisies de la patiente. Il ne remplace pas un enregistrement
                cardiotocographique réalisé en maternité.
              </span>
              <span>
                {index + 1} / {pages.length}
              </span>
            </footer>
          </article>
        </div>
      ))}
    </div>
  );
};

export const pageCount = (timeline: Timeline, options: PrintOptions) =>
  paginate({
    duration: timeline.now,
    rowMinutes: options.rowMinutes,
    mode: options.mode,
    journalLines: options.journal ? timeline.contractions.filter((contraction) => contraction.end !== null).length : 0
  }).length;
