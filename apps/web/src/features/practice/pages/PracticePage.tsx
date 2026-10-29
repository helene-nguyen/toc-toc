//~ The "Préparation" tab: practice contractions (Braxton-Hicks), recorded
// whenever they come — no monitoring to open. The big button times one;
// the figures and the last seven days show whether they pick up; the
// history lists them day by day, with those marked painless during a
// session (changed from their session, not from here).
import { useState } from 'react';
import { Link } from 'react-router';
import { useAppDispatch } from '../../../app/hooks';
import { practiceRemoved, practiceTapped } from '../../monitoring/monitoringSlice';
import { useNow } from '../../monitoring/hooks/useNow';
import { StatTile } from '../../monitoring/components/StatTile';
import { TrashIcon } from '../../monitoring/components/TrashIcon';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PageIntro } from '../../../components/PageIntro';
import { clockAt, longDay, minSec, span } from '../../monitoring/format';
import { groupByDay, practiceSummary, type PracticeRow } from '../domain/practiceStats';
import { usePracticeHistory } from '../usePracticeHistory';
import '../../monitoring/monitoring.css';
import '../practice.css';

const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

// "45 s", or "1:20 min" past a minute
const duration = (seconds: number) => (seconds < 60 ? `${Math.round(seconds)} s` : `${minSec(seconds)} min`);

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // no vibration on this device
  }
};

export const PracticePage = () => {
  const dispatch = useAppDispatch();
  const now = useNow();
  const { entries, ongoing, isLoading, isError } = usePracticeHistory();
  const [pending, setPending] = useState<PracticeRow | null>(null);

  const summary = practiceSummary(entries, new Date(now));
  const days = groupByDay(entries);
  const busiest = Math.max(1, ...summary.week.map((day) => day.count));

  const tap = () => {
    dispatch(practiceTapped());
    vibrate(ongoing ? [20, 60, 20] : 30);
  };

  return (
    <div className="monitoring practice">
      <PageIntro title="Préparation">
        Les contractions de préparation (Braxton-Hicks), en dehors d'une session de monitoring. Notez-les quand elles
        arrivent pour suivre leur fréquence et leur durée au fil des jours.
      </PageIntro>

      {isError && (
        <p className="monitoring__sync" data-error="true">
          Serveur injoignable : l'historique complet s'affichera une fois connecté. Les contractions notées ici partiront
          dès que possible.
        </p>
      )}

      <div className="rhythm__tiles">
        <StatTile label="Aujourd'hui" value={summary.todayCount} />
        <StatTile
          label="Durée moyenne"
          value={summary.todayAverageDuration === null ? null : Math.round(summary.todayAverageDuration)}
          unit="s"
        />
        <StatTile
          label="Intervalle moyen"
          value={summary.todayAverageInterval === null ? null : span(summary.todayAverageInterval)}
        />
        <StatTile label="Dernière, il y a" value={summary.sinceLast === null ? null : span(summary.sinceLast)} />
        <StatTile
          label="Durée de la dernière"
          value={summary.lastDuration === null ? null : duration(summary.lastDuration)}
        />
        <StatTile label="7 derniers jours" value={summary.week.reduce((total, day) => total + day.count, 0)} />
      </div>

      <section className="monitoring__card practice__week" aria-label="Les 7 derniers jours">
        <h3>Les 7 derniers jours</h3>
        <ol className="practice__bars">
          {summary.week.map(({ day, count }) => (
            <li key={day} aria-label={`${longDay(`${day}T12:00:00`)} : ${count}`}>
              <span className="practice__count">{count || ''}</span>
              <span className="practice__bar" style={{ height: `${(count / busiest) * 100}%` }} />
              <span className="practice__day">{weekday.format(new Date(`${day}T12:00:00`))}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="practice__history" aria-label="Historique">
        {isLoading && entries.length === 0 && <p className="monitoring__note">Chargement…</p>}
        {!isLoading && days.length === 0 && (
          <p className="monitoring__note">
            Aucune contraction de préparation pour l'instant. Appuyez sur le bouton en bas quand une contraction
            commence, puis quand elle se termine.
          </p>
        )}
        {days.map(({ day, rows }) => (
          <section key={day} className="practice__day-block">
            <h3>
              {longDay(`${day}T12:00:00`)} · {rows.length} contraction{rows.length > 1 ? 's' : ''}
            </h3>
            <ul>
              {rows.map((row) => (
                <li key={row.entry.id} className="practice__row">
                  <span className="practice__time">{clockAt(row.entry.startedAt)}</span>
                  <span className={row.duration === null ? 'log__live' : undefined}>
                    {row.duration === null ? `${minSec((now - Date.parse(row.entry.startedAt)) / 1000)} …` : duration(row.duration)}
                  </span>
                  <span className="practice__gap">{row.interval === null ? '' : `+ ${span(row.interval)}`}</span>
                  {row.entry.monitoringId ? (
                    <Link className="practice__badge" to={`/sessions/${row.entry.monitoringId}`}>
                      pendant une session
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="practice__delete"
                      aria-label={`Supprimer la contraction de ${clockAt(row.entry.startedAt)}`}
                      onClick={() => setPending(row)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>

      {pending && (
        <ConfirmDialog
          title="Supprimer cette contraction ?"
          message={`Contraction du ${longDay(pending.entry.startedAt).toLowerCase()} à ${clockAt(pending.entry.startedAt)}.`}
          confirmLabel="Supprimer"
          danger
          onConfirm={() => {
            dispatch(practiceRemoved(pending.entry.id));
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}

      <div className="tap-dock">
        <div className="tap-dock__inner">
          <button
            type="button"
            className={`tap-dock__big tap-dock__big--${ongoing ? 'contracting' : 'ready'}`}
            onClick={tap}
          >
            <span>
              <span className="tap-dock__label">{ongoing ? 'Elle se termine' : 'Une contraction commence'}</span>
              <span className="tap-dock__hint">
                {ongoing ? 'Appuyez quand le ventre se relâche' : 'Contraction de préparation, sans session'}
              </span>
            </span>
            {ongoing && (
              <span className="tap-dock__timer">{minSec((now - Date.parse(ongoing.startedAt)) / 1000)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
