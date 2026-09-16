import { useState, useTransition } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { reassignClientUserAction } from '@/lib/actions/team';
import { revalidate } from '@/lib/data/revalidate';

/**
 * Moves one client account to a different client.
 *
 * Shared by the two places that need it, because they are the same act seen
 * from opposite ends: a client's own page moves somebody away or brings
 * somebody in, and the team list moves somebody who is simply filed wrongly.
 * One dialog means one description of what the move actually does.
 */
export function MoveClientUser({
  open,
  onClose,
  user,
  clients,
  currentClientName,
}: {
  open: boolean;
  onClose: () => void;
  user: { id: string; full_name: string; email: string };
  /** Every client except the one they are already with. */
  clients: { id: string; company_name: string }[];
  /** Where they are now, if anywhere. */
  currentClientName?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const targetName = clients.find((c) => c.id === target)?.company_name;

  function close() {
    setTarget('');
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Move ${user.full_name || user.email}`}
      description="Their access follows whichever client they belong to."
      footer={
        <>
          <Button variant="ghost" type="button" disabled={isPending} onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!target || isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await reassignClientUserAction(user.id, target);
                  revalidate();
                  close();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not move the account.');
                }
              })
            }
          >
            {isPending ? 'Moving…' : 'Move'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {currentClientName ? (
          <Alert variant="warning" title={`They lose sight of ${currentClientName}`}>
            From their next request they see {targetName ?? 'the new client'} instead — projects,
            files, requests and messages all change with them. Nothing they wrote is deleted:
            their comments and uploads stay where they are.
          </Alert>
        ) : (
          <Alert variant="info" title="They have no client yet">
            This account signed up without an invitation, so it has never had access to anything.
            Giving it a client grants that access, and switches the account on.
          </Alert>
        )}

        <div>
          <label htmlFor="move-client-target" className="block text-[13px] font-medium">
            Move to
          </label>
          <Select
            id="move-client-target"
            className="mt-1.5"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Choose a client"
            options={clients.map((c) => ({ value: c.id, label: c.company_name }))}
          />
        </div>

        {clients.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">
            There is nowhere else to move them — this is the only client.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
