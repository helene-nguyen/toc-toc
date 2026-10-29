//~ "Are you sure?" modal, from memomentis. Escape or a tap outside cancels;
// Enter confirms (the confirm button has focus); Tab stays inside; focus
// returns to where it was once the dialog closes.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './confirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  // destructive actions get the red button
  danger?: boolean;
  // while the action runs: buttons wait
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
    // keep Tab inside the dialog (two buttons: cycle between them)
    if (event.key === 'Tab') {
      const buttons = Array.from(cardRef.current?.querySelectorAll('button') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length];
      event.preventDefault();
      next?.focus();
    }
  };

  return createPortal(
    <div className="confirm-dialog" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div
        ref={cardRef}
        className="confirm-dialog__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="confirm-dialog__title">
          {title}
        </h2>
        {message && <p className="confirm-dialog__message">{message}</p>}
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__cancel" disabled={busy} onClick={onCancel}>
            Annuler
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`confirm-dialog__confirm${danger ? ' confirm-dialog__confirm--danger' : ''}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
