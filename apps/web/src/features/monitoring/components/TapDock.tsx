//~ The bottom dock, where the thumb rests: the big contraction button and
// the baby-movement button. The big button does one thing at a time —
// start the monitoring, then mark each contraction's start and end — and
// shows how long the current contraction has lasted. Once a contraction
// ends, three chips ask how strong it felt.
import type { Intensity } from '../monitoringTypes';
import { minSec } from '../format';

const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 1, label: 'Légère' },
  { value: 2, label: 'Moyenne' },
  { value: 3, label: 'Forte' }
];

interface TapDockProps {
  running: boolean;
  // seconds the current contraction has lasted, null when none goes on
  ongoingFor: number | null;
  movementCount: number;
  // a movement was noted a moment ago: the button says so
  movementJustNoted: boolean;
  askIntensity: boolean;
  lastIntensity: Intensity | null;
  onStart: () => void;
  onContraction: () => void;
  onMovement: () => void;
  onIntensity: (intensity: Intensity) => void;
}

export const TapDock = ({
  running,
  ongoingFor,
  movementCount,
  movementJustNoted,
  askIntensity,
  lastIntensity,
  onStart,
  onContraction,
  onMovement,
  onIntensity
}: TapDockProps) => {
  const contracting = ongoingFor !== null;
  const mode = !running ? 'start' : contracting ? 'contracting' : 'ready';

  return (
    <div className="tap-dock">
      <div className="tap-dock__inner">
        {askIntensity && running && !contracting && (
          <div className="tap-dock__ask" role="group" aria-label="Intensité de la dernière contraction">
            <span>Intensité ?</span>
            {INTENSITIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className="tap-dock__chip"
                aria-pressed={lastIntensity === value}
                onClick={() => onIntensity(value)}
              >
                {label}
              </button>
            ))}
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
