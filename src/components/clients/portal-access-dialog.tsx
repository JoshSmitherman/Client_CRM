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
import { MoveClientUser } from '@/components/clients/move-client-user';
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
import type { MovableClientUser } from '@/lib/queries/clients';

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
  elsewhere,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  users: PortalUser[];
  invitations: PortalInvitation[];
  /** Every client, so someone can be moved to one of the others. */
  allClients: { id: string; company_name: string }[];
  /** Client accounts belonging elsewhere, or nowhere, that could be moved here. */
  elsewhere: MovableClientUser[];
}) {
  const { profile, userId } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PortalUser | null>(null);
  const [moving, setMoving] = useState<PortalUser | null>(null);
  const [bringing, setBringing] = useState('');

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
                        onClick={() => setMoving(user)}
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

          {/* --- Bring an account that already exists -------------------- */}
          {elsewhere.length > 0 ? (
            <section>
              <h3 className="mb-2 text-[12px] font-medium tracking-wide text-[var(--text-muted)] uppercase">
                Move an existing account here
              </h3>
              <p className="mb-2 text-[12px] text-[var(--text-secondary)]">
                For someone who already has a login — filed under the wrong client, moved company,
                or signed up without an invitation and is waiting for access.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                  <label htmlFor="bring-existing" className="sr-only">
                    Choose an existing account
                  </label>
                  <Select
                    id="bring-existing"
                    value={bringing}
                    onChange={(e) => setBringing(e.target.value)}
                    placeholder="Choose an account"
                    options={elsewhere.map((u) => ({
                      value: u.id,
                      label: `${u.full_name || u.email} — ${u.currentClient ?? 'no client yet'}`,
                    }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!bringing || isPending}
                  onClick={() =>
                    run(async () => {
                      await reassignClientUserAction(bringing, clientId);
                      setBringing('');
                    })
                  }
                >
                  {isPending ? 'Moving…' : `Move to ${clientName}`}
                </Button>
              </div>
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
        <MoveClientUser
          open
          onClose={() => setMoving(null)}
          user={moving}
          currentClientName={clientName}
          clients={allClients.filter((c) => c.id !== clientId)}
        />
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
