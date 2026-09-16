import { Ban, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { useState, useTransition } from 'react';

import { InviteForm } from '@/components/settings/invite-form';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import {
  deleteUserAction,
  reassignClientUserAction,
  revokeInvitationAction,
  setUserActiveAction,
} from '@/lib/actions/team';
import { useAuth } from '@/lib/auth-context';
import { revalidate } from '@/lib/data/revalidate';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS, isAgency, type AppRole } from '@/lib/permissions';

export interface PortalUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
}

export interface PortalInvitation {
  id: string;
  email: string;
  full_name: string;
  expires_at: string;
}

/**
 * Everything to do with who at a client can sign in, in one place.
 *
 * Three different things, deliberately distinguished rather than collapsed
 * into a single "remove":
 *
 *   Cancel an invitation — it was never accepted; the link stops working.
 *   Remove access       — reversible. They cannot sign in; their history and
 *                         their name on past work stay exactly as they are.
 *   Delete the account  — permanent, and it frees the email address so the
 *                         person can be invited again from scratch.
 */
export function PortalAccessDialog({
  open,
  onClose,
  clientId,
  clientName,
  users,
  invitations,
  allClients,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  users: PortalUser[];
  invitations: PortalInvitation[];
  /** Every client, so someone can be moved to one of the others. */
  allClients: { id: string; company_name: string }[];
}) {
  const { profile, userId } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PortalUser | null>(null);
  const [moving, setMoving] = useState<PortalUser | null>(null);
  const [moveTo, setMoveTo] = useState('');

  const isAdmin = profile ? isAgency(profile.role) : false;

  function run(work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        revalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That did not work.');
      }
    });
  }

  return (
    <>
      <Modal
        open={open && deleting === null && moving === null}
        onClose={onClose}
        title={`Portal access — ${clientName}`}
        description="Who at this client can sign in, and what they can see."
        size="lg"
        footer={
          <InviteForm
            clients={[{ id: clientId, company_name: clientName }]}
            canInviteAgency
            defaultClientId={clientId}
            label="Invite someone"
          />
        }
      >
        <div className="space-y-5">
          <Alert variant="info">
            Everyone here sees {clientName} and nothing else — their projects, files, requests and
            messages. Internal notes, other clients and everything in the agency workspace stay
            invisible to them.
          </Alert>

          {error ? (
            <p role="alert" className="text-[13px] text-[var(--danger-text)]">
              {error}
            </p>
          ) : null}

          {/* --- People with logins ------------------------------------- */}
          <section>
            <h3 className="mb-2 text-[12px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
              People
            </h3>

            {users.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nobody can sign in yet"
                description="Invite someone and they will get an email to set their own password."
              />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)]">
                {users.map((user) => {
                  const isSelf = user.id === userId;

                  return (
                    <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Avatar name={user.full_name || user.email} size="sm" />

                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-[var(--surface-hover)]"
                        onClick={() => {
                          setMoving(user);
                          setMoveTo('');
                        }}
                        aria-label={`Move ${user.email} to a different client`}
                      >
                        <span className="block truncate text-[13px] font-medium">
                          {user.full_name || user.email}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--text-muted)]">
                          {user.email} · {ROLE_LABELS[user.role]} · move
                        </span>
                      </button>

                      {user.is_active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="warning">No access</Badge>
                      )}

                      {isAdmin && !isSelf ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() =>
                              run(() => setUserActiveAction(user.id, !user.is_active))
                            }
                          >
                            {user.is_active ? (
                              <>
                                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                Remove access
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                Restore
                              </>
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isPending}
                            aria-label={`Delete the account for ${user.email}`}
                            onClick={() => setDeleting(user)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {users.some((u) => !u.is_active) ? (
              <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                Someone with no access keeps their history and their name on past work. Restoring
                them puts everything back.
              </p>
            ) : null}
          </section>

          {/* --- Outstanding invitations -------------------------------- */}
          {invitations.length > 0 ? (
            <section>
              <h3 className="mb-2 text-[12px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
                Invited, not yet accepted
              </h3>
              <ul className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)]">
                {invitations.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar name={invite.full_name || invite.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {invite.full_name || invite.email}
                      </p>
                      <p className="truncate text-[12px] text-[var(--text-muted)]">
                        Expires {formatDate(invite.expires_at)}
                      </p>
                    </div>
                    <Badge tone="info">Pending</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => run(() => revokeInvitationAction(invite.id))}
                    >
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                Cancelling stops the link in their email from working.
              </p>
            </section>
          ) : null}

          {users.length === 0 && invitations.length === 0 ? (
            <p className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Use the button below to give someone access.
            </p>
          ) : null}
        </div>
      </Modal>

      {moving ? (
        <Modal
          open
          onClose={() => setMoving(null)}
          title={`Move ${moving.full_name || moving.email}`}
          description="Their access follows whichever client they belong to."
          footer={
            <>
              <Button variant="ghost" type="button" onClick={() => setMoving(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!moveTo || isPending}
                onClick={() =>
                  run(async () => {
                    await reassignClientUserAction(moving.id, moveTo);
                    setMoving(null);
                  })
                }
              >
                {isPending ? 'Moving…' : 'Move'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Alert variant="warning" title="They lose sight of this client">
              From their next request they see {allClients.find((c) => c.id === moveTo)
                ?.company_name ?? 'the new client'} instead of {clientName} — the projects, files,
              requests and messages all change with them. Nothing they wrote is deleted; their
              comments and uploads stay where they are.
            </Alert>

            <div>
              <label htmlFor="move-to-client" className="block text-[13px] font-medium">
                Move to
              </label>
              <Select
                id="move-to-client"
                className="mt-1.5"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                placeholder="Choose a client"
                options={allClients
                  .filter((c) => c.id !== clientId)
                  .map((c) => ({ value: c.id, label: c.company_name }))}
              />
            </div>

            {allClients.length < 2 ? (
              <p className="text-[13px] text-[var(--text-muted)]">
                There is only one client to belong to, so there is nowhere to move them yet.
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDelete
          open
          onClose={() => setDeleting(null)}
          title={`Delete the account for ${deleting.full_name || deleting.email}`}
          confirmationText={deleting.email}
          confirmLabel="Delete this account"
          consequences={[
            'They can never sign in again, and any session they have open stops working.',
            'Their name comes off past work — files they uploaded and records they created will show nobody.',
            'The audit log and the activity feed keep their name, because those store it as text.',
            `${deleting.email} is freed, so they can be invited again from scratch.`,
            'Removing access instead is reversible and keeps all of the above intact.',
          ]}
          onConfirm={async () => {
            await deleteUserAction(deleting.id);
            setDeleting(null);
            revalidate();
          }}
        />
      ) : null}
    </>
  );
}
