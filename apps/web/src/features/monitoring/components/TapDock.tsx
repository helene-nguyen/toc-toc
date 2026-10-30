//~ The bottom dock, where the thumb rests: the big contraction button and
// the baby-movement button. The big button does one thing at a time —
// start the monitoring, then mark each contraction's start and end — and
// shows how long the current contraction has lasted. Once a contraction
// ends, two rows of chips describe it: the pain felt (none — Braxton-Hicks
// — light, medium, strong) and the intensity drawn on the trace (auto, or
// a level that caps it). They stay until "OK" or the next contraction.
import { CURVES, PAINS, type Pain } from '../feeling';
import type { CurveLevel } from '../monitoringTypes';
import { minSec } from '../format';

interface TapDockProps {
  running: boolean;
  // seconds the current contraction has lasted, null when none goes on
  ongoingFor: number | null;
  movementCount: number;
  // a movement was noted a moment ago: the button says so
  movementJustNoted: boolean;
  askIntensity: boolean;
  lastPain: Pain | null;
  lastCurve: CurveLevel | null;
  onStart: () => void;
  onContraction: () => void;
  onMovement: () => void;
  onPain: (pain: Pain) => void;
  onCurve: (curve: CurveLevel) => void;
  onAskDone: () => void;
}

export const TapDock = ({
  running,
  ongoingFor,
  movementCount,
  movementJustNoted,
  askIntensity,
  lastPain,
  lastCurve,
  onStart,
  onContraction,
  onMovement,
  onPain,
  onCurve,
  onAskDone
}: TapDockProps) => {
  const contracting = ongoingFor !== null;
  const mode = !running ? 'start' : contracting ? 'contracting' : 'ready';

  return (
    <div className="tap-dock">
      <div className="tap-dock__inner">
        {askIntensity && running && !contracting && (
          <div className="tap-dock__ask-block">
            <div className="tap-dock__ask-head">
              <span>Douleur</span>
              <button type="button" className="tap-dock__done" onClick={onAskDone}>
                OK
              </button>
            </div>
            <div className="tap-dock__ask" role="group" aria-label="Douleur de la dernière contraction">
              {PAINS.map(({ value, label, short }) => (
                <button
                  key={value}
                  type="button"
                  className={`tap-dock__chip${value === 'none' ? ' tap-dock__chip--painless' : ''}`}
                  aria-label={label}
                  aria-pressed={lastPain === value}
                  onClick={() => onPain(value)}
                >
                  {short}
                </button>
              ))}
            </div>
            <div className="tap-dock__ask-head">
              <span>Intensité sur le tracé</span>
            </div>
            <div className="tap-dock__ask" role="group" aria-label="Intensité de la dernière contraction sur le tracé">
              {CURVES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className="tap-dock__chip tap-dock__chip--curve"
                  aria-pressed={lastCurve === value}
                  onClick={() => onCurve(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="tap-dock__buttons">
          <button
            type="button"
            className={`tap-dock__big tap-dock__big--${mode}`}
            onClick={running ? onContraction : onStart}
          >
            <span>
              <span className="tap-dock__label">
                {mode === 'start'
                  ? 'Démarrer le monitoring'
                  : contracting
                    ? 'Fin de la contraction'
                    : 'Une contraction commence'}
              </span>
              <span className="tap-dock__hint">
                {mode === 'start'
                  ? 'Une nouvelle session sera enregistrée'
                  : contracting
                    ? "Appuyez quand la douleur s'arrête"
                    : 'Appuyez dès le début de la douleur'}
              </span>
            </span>
            {contracting && <span className="tap-dock__timer">{minSec(ongoingFor)}</span>}
          </button>
          {running && (
            <button
              type="button"
              className="tap-dock__move"
              data-flash={movementJustNoted}
              aria-label="Noter un mouvement du bébé"
              onClick={onMovement}
            >
              <span className="tap-dock__label">Bébé bouge</span>
              <span className="tap-dock__count">
                {movementJustNoted ? 'Noté ✓' : `${movementCount} noté${movementCount > 1 ? 's' : ''}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
