//~ The live monitoring screen: the trace on top, the rhythm and the journal
// under it, the buttons in the dock at the bottom. Every tap goes to the
// monitoring slice first (instant, works offline); the outbox reaches the
// Pi when it can, and the screen says how many taps are still waiting.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import {
  contractionTapped,
  intensityChosen,
  lastTapUndone,
  monitoringStarted,
  monitoringStopped,
  movementTapped
} from '../monitoringSlice';
import type { Intensity } from '../monitoringTypes';
import { toTimeline } from '../domain/timeline';
import type { ChartMode } from '../chart/drawChart';
import { TocoChart } from '../components/TocoChart';
import { TapDock } from '../components/TapDock';
import { RhythmPanel } from '../components/RhythmPanel';
import { ContractionLog } from '../components/ContractionLog';
import { useNow } from '../hooks/useNow';
import { useWakeLock } from '../hooks/useWakeLock';
import { clockAt, hourMinSec } from '../format';
import '../monitoring.css';

const SYNC_MESSAGES: Record<string, string> = {
  OFFLINE: 'Serveur injoignable : les saisies sont gardées sur le téléphone et partiront dès que possible.',
  IN_THE_FUTURE: "Une saisie a été refusée : l'heure du téléphone est en avance sur celle du serveur."
};

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // no vibration on this device
  }
};

export const MonitoringPage = () => {
  const dispatch = useAppDispatch();
  const { live, outbox, syncError } = useAppSelector((state) => state.monitoring);
  const now = useNow();
  const [mode, setMode] = useState<ChartMode>('split');
  const [askIntensity, setAskIntensity] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [movementNotedAt, setMovementNotedAt] = useState(0);

  const running = live !== null && live.stoppedAt === null;
  const timeline = live ? toTimeline(live, new Date(now)) : null;
  const ongoing = timeline?.contractions.find((contraction) => contraction.end === null) ?? null;
  const lastContraction = live?.contractions.at(-1) ?? null;
  useWakeLock(running);

  // the chart reads the latest state on every animation frame
  const liveRef = useRef(live);
  liveRef.current = live;
  const getTimeline = useCallback(() => (liveRef.current ? toTimeline(liveRef.current, new Date()) : null), []);

  const start = useCallback(() => {
    dispatch(monitoringStarted());
    setAskIntensity(false);
    vibrate(20);
  }, [dispatch]);
  const tapContraction = useCallback(() => {
    setAskIntensity(ongoing !== null);
    dispatch(contractionTapped());
    vibrate(ongoing ? [20, 60, 20] : 30);
  }, [dispatch, ongoing]);
  const tapMovement = useCallback(() => {
    dispatch(movementTapped());
    setMovementNotedAt(Date.now());
    vibrate(15);
  }, [dispatch]);
  const chooseIntensity = (intensity: Intensity) => {
    dispatch(intensityChosen(intensity));
    setAskIntensity(false);
  };
  const stop = () => {
    dispatch(monitoringStopped());
    setConfirmStop(false);
    setAskIntensity(false);
  };

  //~ Keyboard, for a computer: Space for a contraction, M for a movement
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target !== document.body || !running) return;
      if (event.code === 'Space') {
        event.preventDefault();
        tapContraction();
      }
      if (event.key === 'm' || event.key === 'M') tapMovement();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [running, tapContraction, tapMovement]);

  return (
    <div className="monitoring">
      <div className="monitoring__status">
        <span className="monitoring__state" data-running={running}>
          {running
            ? `Monitoring en cours · ${hourMinSec(timeline!.now)}`
            : live
              ? `Session terminée à ${clockAt(live.stoppedAt!)} · `
              : 'Aucun monitoring en cours'}
          {live && !running && <Link to={`/sessions/${live.id}`}>voir la session</Link>}
        </span>
        <span className="monitoring__actions">
        {live && (live.contractions.length > 0 || live.movements.length > 0) && !confirmStop && (
          <Link to={`/sessions/${live.id}/print`} className="monitoring__ghost monitoring__link">
            Imprimer
          </Link>
        )}
        {running &&
          (confirmStop ? (
            <span className="monitoring__confirm">
              Arrêter le monitoring ?
              <button type="button" className="monitoring__danger" onClick={stop}>
                Oui, arrêter
              </button>
              <button type="button" className="monitoring__ghost" onClick={() => setConfirmStop(false)}>
                Non
              </button>
            </span>
          ) : (
            <button type="button" className="monitoring__danger" onClick={() => setConfirmStop(true)}>
              Arrêter
            </button>
          ))}
        </span>
      </div>

      {(outbox.length > 0 || syncError) && (
        <p className="monitoring__sync" data-error={syncError !== null}>
          {syncError ? (SYNC_MESSAGES[syncError] ?? `Une saisie a été refusée par le serveur (${syncError}).`) : null}
          {outbox.length > 0 && ` ${outbox.length} saisie${outbox.length > 1 ? 's' : ''} en attente d'envoi.`}
        </p>
      )}

      {live && timeline ? (
        <>
          <section className="monitoring__card">
            <div className="monitoring__chart-head">
              <h2>Tocogramme</h2>
              <div className="monitoring__legend">
                <span>
                  <i className="monitoring__key monitoring__key--trace" />
                  Tracé estimé
                </span>
                <span>
                  <i className="monitoring__key monitoring__key--contraction" />
                  Contraction
                </span>
                <span>
                  <i className="monitoring__key monitoring__key--movement" />
                  Mouvement bébé
                </span>
                <span className="monitoring__modes" role="group" aria-label="Affichage des mouvements">
                  <button type="button" aria-pressed={mode === 'split'} onClick={() => setMode('split')}>
                    Séparés
                  </button>
                  <button type="button" aria-pressed={mode === 'merged'} onClick={() => setMode('merged')}>
                    Superposés
                  </button>
                </span>
              </div>
            </div>
            <TocoChart
              key={live.id}
              getTimeline={getTimeline}
              startedAt={live.startedAt}
              mode={mode}
              fitAtStart={!running}
            />
          </section>
          <div className="monitoring__panels">
            <RhythmPanel timeline={timeline} />
            <ContractionLog
              monitoring={live}
              timeline={timeline}
              canUndo={running && (live.contractions.length > 0 || live.movements.length > 0)}
              onUndo={() => {
                dispatch(lastTapUndone());
                setAskIntensity(false);
              }}
            />
          </div>
        </>
      ) : (
        <section className="monitoring__card monitoring__welcome">
          <h2>Prête quand vous l'êtes</h2>
          <p>
            Lancez le monitoring avec le bouton en bas de l'écran. Appuyez ensuite au début et à la fin de chaque
            contraction, et sur « Bébé bouge » quand vous sentez le bébé bouger. Le tracé se dessine au fil du temps.
          </p>
        </section>
      )}

      <p className="monitoring__disclaimer">
        Le tracé est reconstruit à partir de vos saisies : ce n'est pas une mesure comme le capteur d'un monitoring en
        maternité. En cas de perte des eaux, saignement, baisse des mouvements du bébé ou doute, appelez votre
        maternité.
      </p>

      <TapDock
        running={running}
        ongoingFor={ongoing && timeline ? timeline.now - ongoing.start : null}
        movementCount={live?.movements.length ?? 0}
        movementJustNoted={now - movementNotedAt < 1400}
        askIntensity={askIntensity}
        lastIntensity={lastContraction?.intensity ?? null}
        onStart={start}
        onContraction={tapContraction}
        onMovement={tapMovement}
        onIntensity={chooseIntensity}
      />
    </div>
  );
};
