import type { Metadata } from 'next';
import Link from 'next/link';

import { TicketTable, type SupportListRow } from '@/components/support/ticket-table';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { SUPPORT_STATUS_LABELS } from '@/lib/constants';
import { requireAgency } from '@/lib/auth';
import { getSupportRequests } from '@/lib/queries/support';
import type { Enums } from '@/lib/supabase/database.types';

export const metadata: Metadata = { title: 'Support' };

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; urgency?: string; mine?: string }>;
}) {
  const session = await requireAgency();
  const { q, status, urgency, mine } = await searchParams;

  const tickets = await getSupportRequests({
    search: q,
    status: status as Enums<'support_status'> | undefined,
    urgency: urgency as Enums<'urgency'> | undefined,
    openOnly: !status,
    assignedTo: mine === '1' ? session.userId : undefined,
  });

  const chip = (active: boolean) =>
    active
      ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
      : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]';

  return (
    <>
      <PageHeader
        title="Support"
        description="Faults and urgent problems, separate from planned change requests."
      />

      <div className="mb-4 space-y-3">
        <div className="max-w-md">
          <SearchField label="Search support tickets" placeholder="Search by subject or reference…" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/support" className={chip(!status && !urgency)}>
            Open
          </Link>
          <Link href="/support?urgency=critical" className={chip(urgency === 'critical')}>
            Critical
          </Link>
          <Link href="/support?urgency=high" className={chip(urgency === 'high')}>
            High
          </Link>
          {(['open', 'in_progress', 'awaiting_client', 'resolved'] as const).map((s) => (
            <Link key={s} href={`/support?status=${s}`} className={chip(status === s)}>
              {SUPPORT_STATUS_LABELS[s]}
            </Link>
          ))}
          <Link href={mine === '1' ? '/support' : '/support?mine=1'} className={chip(mine === '1')}>
            Assigned to me
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Tickets"
          description={`${tickets.length} shown, most urgent and longest waiting first`}
        />
        <TicketTable tickets={tickets as unknown as SupportListRow[]} />
      </Card>
    </>
  );
}
