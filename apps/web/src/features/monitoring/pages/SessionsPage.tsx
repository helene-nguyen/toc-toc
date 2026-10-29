//~ The history: every monitoring, newest first, read from the API. A tap
// opens the session — or the monitoring screen for the one still running.
// The bin deletes a finished session after a confirmation.
import { useState } from 'react';
import { Link } from 'react-router';
import { useListMonitoringsQuery } from '../monitoringApi';
import type { MonitoringSummary } from '../monitoringTypes';
import { useDeleteSession } from '../hooks/useDeleteSession';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { TrashIcon } from '../components/TrashIcon';
import '../monitoring.css';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const duration = (from: string, to: string | null) => {
  const minutes = Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
};

// "jeudi 29 octobre · 15:34"
const when = (monitoring: MonitoringSummary) =>
  `${dayFormat.format(new Date(monitoring.startedAt))} · ${timeFormat.format(new Date(monitoring.startedAt))}`;

export const SessionsPage = () => {
  const { data: monitorings = [], isLoading, isError } = useListMonitoringsQuery();
  const { remove, deleting, failed } = useDeleteSession();
  const [pending, setPending] = useState<MonitoringSummary | null>(null);

  const confirmDelete = async () => {
    if (!pending) return;
    await remove(pending.id);
    setPending(null);
  };

  return (
    <section className="sessions">
      <h2 className="sessions__title">Mes sessions</h2>
      {isLoading && <p className="sessions__empty">Chargement…</p>}
      {isError && <p className="sessions__empty">Impossible de joindre le serveur. Vérifiez la connexion au Raspberry Pi.</p>}
      {failed && (
        <p className="monitoring__sync" data-error="true">
          La suppression n'a pas abouti : le serveur est injoignable. Réessayez une fois connecté.
        </p>
      )}
      {!isLoading && !isError && monitorings.length === 0 && (
        <p className="sessions__empty">Aucune session enregistrée pour l'instant.</p>
      )}
      <ul className="sessions__list">
        {monitorings.map((monitoring) => (
          <li key={monitoring.id} className="sessions__item">
            <Link
              to={monitoring.stoppedAt === null ? '/' : `/sessions/${monitoring.id}`}
              className="sessions__open"
            >
              <span className="sessions__when">{when(monitoring)}</span>
              <span className="sessions__facts">
                <span>{duration(monitoring.startedAt, monitoring.stoppedAt)}</span>
                <span>{monitoring.contractionCount} contractions</span>
                <span>{monitoring.movementCount} mvts bébé</span>
                {monitoring.stoppedAt === null && <span className="sessions__badge">En cours</span>}
              </span>
            </Link>
            {/* a running session is stopped first, from the monitoring screen */}
            {monitoring.stoppedAt !== null && (
              <button
                type="button"
                className="sessions__delete"
                aria-label={`Supprimer la session du ${when(monitoring)}`}
                title="Supprimer"
                onClick={() => setPending(monitoring)}
              >
                <TrashIcon />
              </button>
            )}
          </li>
        ))}
      </ul>

      {pending && (
        <ConfirmDialog
          title="Supprimer cette session ?"
          message={`Session du ${when(pending)} (${duration(pending.startedAt, pending.stoppedAt)}, ${pending.contractionCount} contractions). Son tracé et son journal seront supprimés définitivement.`}
          confirmLabel="Supprimer"
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
};
