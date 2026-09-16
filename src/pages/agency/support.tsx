import { Link, useSearchParams } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { TicketTable, type SupportListRow } from '@/components/support/ticket-table';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { useAuth } from '@/lib/auth-context';
import { SUPPORT_STATUS_LABELS } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { getSupportRequests } from '@/lib/queries/support';
import type { Enums } from '@/lib/supabase/database.types';
import { useDocumentTitle } from '@/lib/use-document-title';

const chip = (active: boolean) =>
  active
    ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
    : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]';

export function SupportPage() {
  useDocumentTitle('Support');
  const { userId } = useAuth();
  const [params] = useSearchParams();

  const q = params.get('q') ?? undefined;
  const status = params.get('status') ?? undefined;
  const urgency = params.get('urgency') ?? undefined;
  const mine = params.get('mine');

  const query = useQuery(
    () =>
      getSupportRequests({
        search: q,
        status: status as Enums<'support_status'> | undefined,
        urgency: urgency as Enums<'urgency'> | undefined,
        openOnly: !status,
        assignedTo: mine === '1' ? (userId ?? undefined) : undefined,
      }),
    [q, status, urgency, mine, userId],
  );

  return (
    <>
      <PageHeader
        title="Support"
        description="Faults and urgent problems, separate from planned change requests."
      />

      <div className="mb-4 space-y-3">
        <div className="max-w-md">
          <SearchField
            label="Search support tickets"
            placeholder="Search by subject or reference…"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/support" className={chip(!status && !urgency)}>
            Open
          </Link>
          <Link to="/support?urgency=critical" className={chip(urgency === 'critical')}>
            Critical
          </Link>
          <Link to="/support?urgency=high" className={chip(urgency === 'high')}>
            High
          </Link>
          {(['open', 'in_progress', 'awaiting_client', 'resolved'] as const).map((s) => (
            <Link key={s} to={`/support?status=${s}`} className={chip(status === s)}>
              {SUPPORT_STATUS_LABELS[s]}
            </Link>
          ))}
          <Link to={mine === '1' ? '/support' : '/support?mine=1'} className={chip(mine === '1')}>
            Assigned to me
          </Link>
        </div>
      </div>

      <QueryBoundary query={query}>
        {(tickets) => (
          <Card>
            <CardHeader
              title="Tickets"
              description={`${tickets.length} shown, most urgent and longest waiting first`}
            />
            <TicketTable tickets={tickets as unknown as SupportListRow[]} />
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
