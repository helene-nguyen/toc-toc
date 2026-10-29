//~ The history: every monitoring, newest first, read from the API.
import { useListMonitoringsQuery } from '../monitoringApi';
import '../monitoring.css';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const duration = (from: string, to: string | null) => {
  const minutes = Math.round(((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
};

export const SessionsPage = () => {
  const { data: monitorings = [], isLoading, isError } = useListMonitoringsQuery();

  return (
    <section className="sessions">
      <h2 className="sessions__title">Mes sessions</h2>
      {isLoading && <p className="sessions__empty">Chargement…</p>}
      {isError && <p className="sessions__empty">Impossible de joindre le serveur. Vérifiez la connexion au Raspberry Pi.</p>}
      {!isLoading && !isError && monitorings.length === 0 && (
        <p className="sessions__empty">Aucune session enregistrée pour l'instant.</p>
      )}
      <ul className="sessions__list">
        {monitorings.map((monitoring) => (
          <li key={monitoring.id} className="sessions__item">
            <span className="sessions__when">
              {dayFormat.format(new Date(monitoring.startedAt))} · {timeFormat.format(new Date(monitoring.startedAt))}
            </span>
            <span className="sessions__facts">
              <span>{duration(monitoring.startedAt, monitoring.stoppedAt)}</span>
              <span>{monitoring.contractionCount} contractions</span>
              <span>{monitoring.movementCount} mvts bébé</span>
              {monitoring.stoppedAt === null && <span className="sessions__badge">En cours</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
