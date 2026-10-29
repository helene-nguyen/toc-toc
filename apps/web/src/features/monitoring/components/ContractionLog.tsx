//~ The journal: one row per contraction, newest on top, with clock times —
// the figures a midwife asks for on the phone. How each one felt can be
// changed on any row, during the session or afterwards: the intensity
// doesn't move the trace, "painless" (Braxton-Hicks) draws it low.
import type { Monitoring } from '../monitoringTypes';
import type { Timeline } from '../domain/timeline';
import { FEELINGS, feelingLabel, feelingOf, parseFeeling, type Feeling } from '../feeling';
import { clockAt, minSec } from '../format';

interface ContractionLogProps {
  monitoring: Monitoring;
  timeline: Timeline;
  // undo only makes sense while the monitoring runs
  canUndo?: boolean;
  onUndo?: () => void;
  // without it, the feeling is shown read-only
  onFeelingChange?: (contractionId: string, feeling: Feeling) => void;
}

export const ContractionLog = ({
  monitoring,
  timeline,
  canUndo = false,
  onUndo,
  onFeelingChange
}: ContractionLogProps) => {
  // the timeline lists contractions by start, like this sorted copy: same index, same contraction
  const byStart = [...monitoring.contractions].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const rows = timeline.contractions.map((contraction, index) => ({
    id: byStart[index]?.id ?? String(index),
    number: index + 1,
    contraction,
    interval: index === 0 ? null : contraction.start - timeline.contractions[index - 1].start
  }));
  const count = rows.length;

  return (
    <section className="log" aria-label="Journal des contractions">
      <h3 className="log__title">
        Journal · {count} contraction{count > 1 ? 's' : ''}
      </h3>
      <div className="log__scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Début</th>
              <th>Durée</th>
              <th>Intervalle</th>
              <th>Intensité</th>
            </tr>
          </thead>
          <tbody>
            {count === 0 && (
              <tr>
                <td colSpan={5} className="log__empty">
                  Aucune contraction pour l'instant. Appuyez sur le grand bouton au début de la prochaine.
                </td>
              </tr>
            )}
            {[...rows].reverse().map(({ id, number, contraction, interval }) => (
              <tr key={id}>
                <td>{number}</td>
                <td>{clockAt(monitoring.startedAt, contraction.start)}</td>
                {contraction.end === null ? (
                  <td className="log__live">{minSec(timeline.now - contraction.start)} …</td>
                ) : (
                  <td>{Math.round(contraction.end - contraction.start)} s</td>
                )}
                <td>{interval === null ? '–' : minSec(interval)}</td>
                <td>
                  {contraction.braxtonHicks ? (
                    <span className="log__bar log__bar--painless" />
                  ) : (
                    <span className="log__bar" style={{ width: contraction.intensity * 12 }} />
                  )}{' '}
                  {onFeelingChange ? (
                    <select
                      className="log__intensity"
                      value={feelingOf(contraction)}
                      aria-label={`Ressenti de la contraction ${number}`}
                      onChange={(event) => onFeelingChange(id, parseFeeling(event.target.value))}
                    >
                      {FEELINGS.map(({ value, short }) => (
                        <option key={value} value={value}>
                          {short}
                        </option>
                      ))}
                    </select>
                  ) : (
                    feelingLabel(contraction)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canUndo && (
        <button type="button" className="log__undo" onClick={onUndo}>
          Annuler la dernière saisie
        </button>
      )}
    </section>
  );
};
