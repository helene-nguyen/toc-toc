//~ The journal: one row per contraction, newest on top, with clock times —
// the figures a midwife asks for on the phone. On any row, during the
// session or afterwards, the pain felt can be changed (it doesn't move the
// trace) and so can the intensity drawn (auto, or a cap).
import type { CurveLevel, Monitoring } from '../monitoringTypes';
import type { Timeline } from '../domain/timeline';
import { CURVES, PAINS, curveLabel, curveOf, painLabel, painOf, parsePain, type Pain } from '../feeling';
import { clockAt, minSec } from '../format';

interface ContractionLogProps {
  monitoring: Monitoring;
  timeline: Timeline;
  // undo only makes sense while the monitoring runs
  canUndo?: boolean;
  onUndo?: () => void;
  // without them, pain and intensity are shown read-only
  onPainChange?: (contractionId: string, pain: Pain) => void;
  onCurveChange?: (contractionId: string, curve: CurveLevel) => void;
}

export const ContractionLog = ({
  monitoring,
  timeline,
  canUndo = false,
  onUndo,
  onPainChange,
  onCurveChange
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
              <th>Douleur</th>
              <th>Intensité</th>
            </tr>
          </thead>
          <tbody>
            {count === 0 && (
              <tr>
                <td colSpan={6} className="log__empty">
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
                  {onPainChange ? (
                    <select
                      className="log__intensity"
                      value={painOf(contraction)}
                      aria-label={`Douleur de la contraction ${number}`}
                      onChange={(event) => onPainChange(id, parsePain(event.target.value))}
                    >
                      {PAINS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    painLabel(contraction)
                  )}
                </td>
                <td>
                  {onCurveChange ? (
                    <select
                      className="log__intensity"
                      value={curveOf(contraction)}
                      aria-label={`Intensité de la contraction ${number} sur le tracé`}
                      onChange={(event) => onCurveChange(id, event.target.value as CurveLevel)}
                    >
                      {CURVES.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    curveLabel(contraction)
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
