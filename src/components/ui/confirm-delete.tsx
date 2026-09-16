import { useState } from 'react';

import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';

/**
 * Confirmation for something that cannot be undone.
 *
 * The person types the name of the thing they are destroying. That is more
 * friction than an "Are you sure?" and deliberately so: a second button is
 * clicked reflexively, a name has to be read off the screen and matched, which
 * is hard to do to the wrong record by accident.
 *
 * `consequences` is a list rather than a sentence because the caller usually
 * knows real numbers — "3 projects", "48 files" — and a specific warning is
 * read where a general one is skipped.
 */
export function ConfirmDelete({
  open,
  onClose,
  onConfirm,
  title,
  confirmationText,
  consequences,
  confirmLabel = 'Delete permanently',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  /** What the person must type, normally the record's own name. */
  confirmationText: string;
  consequences: string[];
  confirmLabel?: string;
}) {
  const [typed, setTyped] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === confirmationText.trim().toLowerCase();

  function close() {
    setTyped('');
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description="This cannot be undone."
      footer={
        <>
          <Button variant="ghost" type="button" disabled={isPending} onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={!matches || isPending}
            onClick={async () => {
              setIsPending(true);
              setError(null);
              try {
                await onConfirm();
                close();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not delete that.');
              } finally {
                setIsPending(false);
              }
            }}
          >
            {isPending ? 'Deleting…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert variant="danger" title="What goes with it">
          <ul className="mt-1 space-y-0.5">
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Alert>

        <div>
          <label htmlFor="confirm-delete-input" className="block text-[13px] font-medium">
            Type <span className="font-mono text-[var(--danger-text)]">{confirmationText}</span> to
            confirm
          </label>
          <Input
            id="confirm-delete-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="mt-1.5"
            aria-describedby={error ? 'confirm-delete-error' : undefined}
          />
        </div>

        {error ? (
          <p id="confirm-delete-error" role="alert" className="text-[13px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
