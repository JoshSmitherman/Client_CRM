import { useState, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { revokeInvitationAction, setUserActiveAction, setUserRoleAction } from '@/lib/actions/team';
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

  const roleOptions = [...AGENCY_ROLES, ...CLIENT_ROLES];

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
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => run(() => setUserActiveAction(member.id, !member.is_active))}
                      >
                        {member.is_active ? 'Deactivate' : 'Reactivate'}
                      </Button>
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
    </>
  );
}
