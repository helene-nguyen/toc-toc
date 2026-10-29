//~ Preview before printing: the A4 pages exactly as they will come out,
// with a few choices — 30 min or 1 h of trace per row, movements apart or
// merged, the journal or not, a note for the header. "Imprimer" opens the
// browser's print dialog (a printer, or "Save as PDF").
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMonitoring } from '../hooks/useMonitoring';
import { toTimeline } from '../domain/timeline';
import { useNow } from '../hooks/useNow';
import { PrintSheet, pageCount, type PrintOptions } from '../print/PrintSheet';
import '../monitoring.css';

export const PrintPreviewPage = () => {
  const { id = '' } = useParams();
  const { monitoring, isLoading, isError } = useMonitoring(id);
  // a running session prints as it stands; the preview refreshes each minute
  const now = useNow(60_000);
  const [options, setOptions] = useState<PrintOptions>({ rowMinutes: 30, mode: 'split', journal: true, notes: '' });
  const set = (changes: Partial<PrintOptions>) => setOptions((current) => ({ ...current, ...changes }));

  if (isLoading) return <p className="monitoring__note">Chargement…</p>;
  if (isError || !monitoring) {
    return (
      <p className="monitoring__note">
        Session introuvable, ou serveur injoignable. <Link to="/sessions">Retour à mes sessions</Link>
      </p>
    );
  }

  const timeline = toTimeline(monitoring, new Date(now));
  const pages = pageCount(timeline, options);
  const back = monitoring.stoppedAt === null ? '/' : `/sessions/${monitoring.id}`;

  return (
    <div className="print-preview">
      <div className="print-preview__bar">
        <div className="print-preview__row print-preview__row--spread">
          <Link to={back} className="session__back">
            ← Retour
          </Link>
          <span className="print-preview__pages">
            {pages} page{pages > 1 ? 's' : ''} · A4 paysage
          </span>
          <button type="button" className="session__primary" onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
        <div className="print-preview__row">
          <span className="monitoring__modes" role="group" aria-label="Durée par ligne">
            <button type="button" aria-pressed={options.rowMinutes === 30} onClick={() => set({ rowMinutes: 30 })}>
              30 min / ligne
            </button>
            <button type="button" aria-pressed={options.rowMinutes === 60} onClick={() => set({ rowMinutes: 60 })}>
              1 h / ligne
            </button>
          </span>
          <span className="monitoring__modes" role="group" aria-label="Affichage des mouvements">
            <button type="button" aria-pressed={options.mode === 'split'} onClick={() => set({ mode: 'split' })}>
              Séparés
            </button>
            <button type="button" aria-pressed={options.mode === 'merged'} onClick={() => set({ mode: 'merged' })}>
              Superposés
            </button>
          </span>
          <label className="print-preview__check">
            <input
              type="checkbox"
              checked={options.journal}
              onChange={(event) => set({ journal: event.target.checked })}
            />
            Joindre le journal
          </label>
        </div>
        <input
          type="text"
          className="print-preview__notes"
          maxLength={140}
          placeholder="Note en tête de page (nom, maternité, remarque…)"
          aria-label="Note en tête de page"
          value={options.notes}
          onChange={(event) => set({ notes: event.target.value })}
        />
      </div>
      <PrintSheet monitoring={monitoring} timeline={timeline} options={options} />
    </div>
  );
};
