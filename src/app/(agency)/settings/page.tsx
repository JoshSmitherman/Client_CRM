import type { Metadata } from 'next';
import Link from 'next/link';

import { AgencySettingsForm } from '@/components/settings/agency-settings-form';
import { InviteForm } from '@/components/settings/invite-form';
import { StageList } from '@/components/settings/stage-list';
import { TeamTable, type PendingInvite, type TeamMember } from '@/components/settings/team-table';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { requireAgencyAdmin } from '@/lib/auth';
import { getClients } from '@/lib/queries/clients';
import { getLifecycleStages } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Settings' };

const TABS = [
  { key: 'agency', label: 'Agency' },
  { key: 'team', label: 'Team' },
  { key: 'stages', label: 'Project stages' },
  { key: 'audit', label: 'Audit log' },
] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireAgencyAdmin();
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab)?.key ?? 'agency';

  const supabase = await createClient();

  const [{ data: settings }, { data: members }, { data: invitations }, stages, clients, { data: audit }] =
    await Promise.all([
      supabase.from('agency_settings').select('*').maybeSingle(),
      supabase
        .from('users')
        .select('id, full_name, email, role, is_active, last_seen_at, job_title')
        .is('deleted_at', null)
        .order('full_name'),
      supabase
        .from('invitations')
        .select('id, email, full_name, role, expires_at, created_at')
        .is('accepted_at', null)
        .is('revoked_at', null)
        .order('created_at', { ascending: false }),
      getLifecycleStages(),
      getClients(),
      active === 'audit'
        ? supabase
            .from('audit_logs')
            .select('id, action, entity_type, entity_id, actor_email, created_at, ip_address')
            .order('created_at', { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Agency configuration, your team, and the record of what has happened."
        actions={
          active === 'team' ? (
            <InviteForm
              clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
              canInviteAgency
            />
          ) : null
        }
      />

      <nav
        className="mb-5 -mb-px flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
        aria-label="Settings sections"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/settings?tab=${t.key}`}
            aria-current={active === t.key ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active === t.key
                ? 'border-[var(--accent)] text-[var(--accent-text)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
            )}
          >
            {t.label}
          </Link>
        ))}
        <Link
          href="/settings/account"
          className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          Your account
        </Link>
      </nav>

      {active === 'agency' ? <AgencySettingsForm settings={settings} /> : null}

      {active === 'team' ? (
        <Card>
          <CardHeader
            title="People"
            description="Accounts are created by invitation only — there is no public signup."
          />
          <TeamTable
            members={(members ?? []) as TeamMember[]}
            invitations={(invitations ?? []) as PendingInvite[]}
            currentUserId={session.userId}
            canManage
          />
        </Card>
      ) : null}

      {active === 'stages' ? <StageList stages={stages} /> : null}

      {active === 'audit' ? (
        <Card>
          <CardHeader
            title="Audit log"
            description="Append-only. Nobody can edit or delete these entries, including you."
          />
          {(audit ?? []).length === 0 ? (
            <CardBody>
              <p className="text-[13px] text-[var(--text-muted)]">Nothing recorded yet.</p>
            </CardBody>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Who</Th>
                    <Th>Action</Th>
                    <Th>Entity</Th>
                    <Th>From</Th>
                  </tr>
                </thead>
                <tbody>
                  {(audit ?? []).map((entry) => (
                    <Tr key={entry.id}>
                      <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                        {formatDateTime(entry.created_at)}
                      </Td>
                      <Td className="text-[13px]">{entry.actor_email ?? 'System'}</Td>
                      <Td className="font-mono text-[12px]">{entry.action}</Td>
                      <Td className="text-[12px] text-[var(--text-muted)]">
                        {entry.entity_type}
                        {entry.entity_id ? (
                          <span className="block font-mono">{entry.entity_id.slice(0, 8)}…</span>
                        ) : null}
                      </Td>
                      <Td className="font-mono text-[12px] text-[var(--text-muted)]">
                        {entry.ip_address ?? '—'}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      ) : null}
    </>
  );
}
