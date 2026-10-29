//~ The journal: one row per contraction, newest on top, with clock times —
// the figures a midwife asks for on the phone.
import type { Monitoring } from '../monitoringTypes';
import type { Timeline } from '../domain/timeline';
import { clockAt, minSec } from '../format';

const INTENSITY_LABEL = { 1: 'Légère', 2: 'Moyenne', 3: 'Forte' } as const;

interface ContractionLogProps {
  monitoring: Monitoring;
  timeline: Timeline;
  // undo only makes sense while the monitoring runs
  canUndo?: boolean;
  onUndo?: () => void;
}

export const ContractionLog = ({ monitoring, timeline, canUndo = false, onUndo }: ContractionLogProps) => {
  const rows = timeline.contractions.map((contraction, index) => ({
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
            {[...rows].reverse().map(({ number, contraction, interval }) => (
              <tr key={number}>
                <td>{number}</td>
                <td>{clockAt(monitoring.startedAt, contraction.start)}</td>
                {contraction.end === null ? (
                  <td className="log__live">{minSec(timeline.now - contraction.start)} …</td>
                ) : (
                  <td>{Math.round(contraction.end - contraction.start)} s</td>
                )}
                <td>{interval === null ? '–' : minSec(interval)}</td>
                <td>
                  <span className="log__bar" style={{ width: contraction.intensity * 12 }} />{' '}
                  {INTENSITY_LABEL[contraction.intensity]}
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
