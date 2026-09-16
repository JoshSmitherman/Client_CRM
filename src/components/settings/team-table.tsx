import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import {
  deleteUserAction,
  revokeInvitationAction,
  setUserActiveAction,
  setUserRoleAction,
} from '@/lib/actions/team';
import { revalidate } from '@/lib/data/revalidate';
import { formatDate, formatRelative } from '@/lib/format';
import { AGENCY_ROLES, CLIENT_ROLES, ROLE_LABELS, type AppRole } from '@/lib/permissions';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  last_seen_at: string | null;
  job_title: string | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  expires_at: string;
  created_at: string;
}

export function TeamTable({
  members,
  invitations,
  currentUserId,
  canManage,
}: {
  members: TeamMember[];
  invitations: PendingInvite[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  const roleOptions: AppRole[] = [...AGENCY_ROLES, ...CLIENT_ROLES];

  return (
    <>
      {error ? (
        <p role="alert" className="border-b border-[var(--border-subtle)] px-5 py-2 text-[12px] text-[var(--danger-text)]">
          {error}
        </p>
      ) : null}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last seen</Th>
              {canManage ? <Th /> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <Tr key={member.id}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={member.full_name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">
                        {member.full_name || member.email}
                        {member.id === currentUserId ? (
                          <span className="ml-1.5 text-[12px] font-normal text-[var(--text-muted)]">
                            (you)
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--text-muted)]">
                        {member.email}
                      </span>
                    </span>
                  </span>
                </Td>

                <Td>
                  {canManage && member.id !== currentUserId ? (
                    <>
                      <label htmlFor={`role-${member.id}`} className="sr-only">
                        Role for {member.full_name || member.email}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        value={member.role}
                        disabled={isPending}
                        onChange={(e) => run(() => setUserRoleAction(member.id, e.target.value))}
                        className="h-8 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 text-[12px]"
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span className="text-[13px]">{ROLE_LABELS[member.role]}</span>
                  )}
                </Td>

                <Td>
                  {member.is_active ? (
                    <Badge tone="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Deactivated</Badge>
                  )}
                </Td>

                <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                  {member.last_seen_at ? formatRelative(member.last_seen_at) : 'Never'}
                </Td>

                {canManage ? (
                  <Td className="text-right">
                    {member.id !== currentUserId ? (
                      <span className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() =>
                            run(() => setUserActiveAction(member.id, !member.is_active))
                          }
                        >
                          {member.is_active ? 'Remove access' : 'Restore'}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={isPending}
                          aria-label={`Delete the account for ${member.email}`}
                          onClick={() => setDeleting(member)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </span>
                    ) : null}
                  </Td>
                ) : null}
              </Tr>
            ))}

            {invitations.map((invite) => (
              <Tr key={invite.id}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={invite.full_name || invite.email} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">
                        {invite.full_name || invite.email}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--text-muted)]">
                        {invite.email}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td className="text-[13px]">{ROLE_LABELS[invite.role]}</Td>
                <Td>
                  <Badge tone="info">Invited</Badge>
                </Td>
                <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                  Expires {formatDate(invite.expires_at)}
                </Td>
                {canManage ? (
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => run(() => revokeInvitationAction(invite.id))}
                    >
                      Revoke
                    </Button>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

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
