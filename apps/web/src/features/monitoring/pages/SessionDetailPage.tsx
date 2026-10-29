//~ One past session: its whole trace (opened on "Toute la session", zoomable), the
// figures, the journal; from here it is printed or deleted. A session still
// running belongs to the monitoring screen.
import { useCallback, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useAppDispatch } from '../../../app/hooks';
import { useDeleteMonitoringMutation, useSaveContractionMutation } from '../monitoringApi';
import { intensityChanged, liveForgotten } from '../monitoringSlice';
import type { Intensity } from '../monitoringTypes';
import { useMonitoring } from '../hooks/useMonitoring';
import { toTimeline } from '../domain/timeline';
import { sessionSummary } from '../domain/stats';
import type { ChartMode } from '../chart/drawChart';
import { TocoChart } from '../components/TocoChart';
import { ContractionLog } from '../components/ContractionLog';
import { StatTile } from '../components/StatTile';
import { clockAt, longDay, minSec, span } from '../format';
import '../monitoring.css';

export const SessionDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { monitoring, isLoading, isError, isLocal } = useMonitoring(id);
  const [deleteMonitoring, { isLoading: deleting }] = useDeleteMonitoringMutation();
  const [saveContraction] = useSaveContractionMutation();
  const [intensityError, setIntensityError] = useState(false);
  const [mode, setMode] = useState<ChartMode>('split');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const monitoringRef = useRef(monitoring);
  monitoringRef.current = monitoring;
  const getTimeline = useCallback(
    () => (monitoringRef.current ? toTimeline(monitoringRef.current, new Date()) : null),
    []
  );

  if (isLoading) return <p className="monitoring__note">Chargement…</p>;
  if (isError || !monitoring) {
    return (
      <p className="monitoring__note">
        Session introuvable, ou serveur injoignable. <Link to="/sessions">Retour à mes sessions</Link>
      </p>
    );
  }
  if (monitoring.stoppedAt === null) return <Navigate to="/" replace />;

  const timeline = toTimeline(monitoring, new Date());
  const summary = sessionSummary(timeline);

  const remove = async () => {
    try {
      await deleteMonitoring(monitoring.id).unwrap();
      dispatch(liveForgotten(monitoring.id));
      navigate('/sessions', { replace: true });
    } catch {
      setDeleteError(true);
      setConfirmDelete(false);
    }
  };

  //~ The session recorded on this phone goes through the outbox (works
  // offline); an older one is saved straight to the API
  const changeIntensity = async (contractionId: string, intensity: Intensity) => {
    if (isLocal) {
      dispatch(intensityChanged({ contractionId, intensity }));
      return;
    }
    const contraction = monitoring.contractions.find((candidate) => candidate.id === contractionId);
    if (!contraction) return;
    try {
      await saveContraction({ monitoringId: monitoring.id, contraction: { ...contraction, intensity } }).unwrap();
      setIntensityError(false);
    } catch {
      setIntensityError(true);
    }
  };

  return (
    <div className="monitoring session">
      <Link to="/sessions" className="session__back">
        ← Mes sessions
      </Link>
      <div>
        <h2 className="session__title">{longDay(monitoring.startedAt)}</h2>
        <span className="session__times">
          {clockAt(monitoring.startedAt)} – {clockAt(monitoring.stoppedAt)} · {span(summary.duration)}
        </span>
      </div>

      <section className="monitoring__card">
        <div className="monitoring__chart-head">
          <h2>Tocogramme</h2>
          <span className="monitoring__modes" role="group" aria-label="Affichage des mouvements">
            <button type="button" aria-pressed={mode === 'split'} onClick={() => setMode('split')}>
              Séparés
            </button>
            <button type="button" aria-pressed={mode === 'merged'} onClick={() => setMode('merged')}>
              Superposés
            </button>
          </span>
        </div>
        <TocoChart key={monitoring.id} getTimeline={getTimeline} startedAt={monitoring.startedAt} mode={mode} fitAtStart />
      </section>

      <div className="session__actions">
        <Link to={`/sessions/${monitoring.id}/print`} className="session__primary">
          Aperçu avant impression
        </Link>
        {confirmDelete ? (
          <span className="monitoring__confirm">
            Supprimer cette session ?
            <button type="button" className="monitoring__danger" disabled={deleting} onClick={remove}>
              Oui, supprimer
            </button>
            <button type="button" className="monitoring__ghost" onClick={() => setConfirmDelete(false)}>
              Non
            </button>
          </span>
        ) : (
          <button type="button" className="monitoring__danger" onClick={() => setConfirmDelete(true)}>
            Supprimer
          </button>
        )}
      </div>
      {deleteError && (
        <p className="monitoring__sync" data-error="true">
          La suppression n'a pas abouti : le serveur est injoignable. Réessayez une fois connecté.
        </p>
      )}

      <div className="rhythm__tiles">
        <StatTile label="Durée" value={span(summary.duration)} />
        <StatTile label="Contractions" value={summary.contractionCount} />
        <StatTile
          label="Intervalle moyen"
          value={summary.averageInterval === null ? null : minSec(summary.averageInterval)}
          unit="min"
        />
        <StatTile
          label="Durée moyenne"
          value={summary.averageDuration === null ? null : Math.round(summary.averageDuration)}
          unit="s"
        />
        <StatTile label="Mouvements bébé" value={summary.movementCount} />
        <StatTile
          label="Mouvements"
          value={summary.movementsPerHour === null ? null : summary.movementsPerHour.toFixed(1).replace('.', ',')}
          unit="/ h"
        />
      </div>

      {intensityError && (
        <p className="monitoring__sync" data-error="true">
          L'intensité n'a pas pu être enregistrée : le serveur est injoignable. Réessayez une fois connecté.
        </p>
      )}
      <ContractionLog monitoring={monitoring} timeline={timeline} onIntensityChange={changeIntensity} />
    </div>
  );
};
