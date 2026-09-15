'use client';

import { UserPlus, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Select } from '@/components/ui/field';
import { addProjectMemberAction, removeProjectMemberAction } from '@/lib/actions/projects';
import { ROLE_LABELS, type AppRole } from '@/lib/permissions';

export interface MemberRow {
  id: string;
  user_id: string;
  project_role: string;
  can_edit: boolean;
  users: { id: string; full_name: string; email: string; role: AppRole } | null;
}

/**
 * Membership is the access control for non-manager agency roles: a developer
 * sees only the projects they are a member of, enforced by RLS.
 */
export function ProjectMembers({
  projectId,
  members,
  staff,
  canManage,
}: {
  projectId: string;
  members: unknown[];
  staff: { id: string; full_name: string; role: AppRole }[];
  canManage: boolean;
}) {
  const rows = members as MemberRow[];
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const memberIds = new Set(rows.map((m) => m.user_id));
  const available = staff.filter((s) => !memberIds.has(s.id));

  return (
    <Card>
      <CardHeader
        title="Team"
        description="Who can see and edit this project."
        action={
          canManage && available.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Add
            </Button>
          ) : null
        }
      />

      {adding ? (
        <form
          action={addProjectMemberAction.bind(null, projectId)}
          className="space-y-3 border-b border-[var(--border-subtle)] p-5"
        >
          <Field label="Team member">
            {({ id }) => (
              <Select
                id={id}
                name="userId"
                required
                placeholder="Choose someone"
                options={available.map((s) => ({
                  value: s.id,
                  label: `${s.full_name || 'Unnamed'} — ${ROLE_LABELS[s.role]}`,
                }))}
              />
            )}
          </Field>

          <Field label="Role on this project">
            {({ id }) => (
              <Select
                id={id}
                name="projectRole"
                defaultValue="contributor"
                options={[
                  { value: 'lead', label: 'Lead' },
                  { value: 'contributor', label: 'Contributor' },
                  { value: 'reviewer', label: 'Reviewer' },
                ]}
              />
            )}
          </Field>

          <Checkbox name="canEdit" defaultChecked label="Can edit" description="Unticked, they have read-only access." />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Add to project
            </Button>
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <CardBody>
          <p className="text-[13px] text-[var(--text-muted)]">
            No one is assigned yet. Administrators and project managers can see every project
            regardless.
          </p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {rows.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={member.users?.full_name ?? 'Unknown'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {member.users?.full_name ?? 'Unknown user'}
                </p>
                <p className="truncate text-[12px] text-[var(--text-muted)]">
                  {member.users ? ROLE_LABELS[member.users.role] : ''} · {member.project_role}
                </p>
              </div>

              {!member.can_edit ? <Badge tone="neutral">Read-only</Badge> : null}

              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await removeProjectMemberAction(projectId, member.id);
                    })
                  }
                  aria-label={`Remove ${member.users?.full_name ?? 'member'}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
