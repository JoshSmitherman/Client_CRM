import type { Metadata } from 'next';
import Link from 'next/link';

import { RequestTable, type ChangeRequestListRow } from '@/components/change-requests/request-table';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { CHANGE_STATUS_LABELS } from '@/lib/constants';
import { requireAgency } from '@/lib/auth';
import { getChangeRequests } from '@/lib/queries/change-requests';
import type { Enums } from '@/lib/supabase/database.types';

export const metadata: Metadata = { title: 'Change requests' };

const QUICK_FILTERS: { label: string; status?: Enums<'change_request_status'> }[] = [
  { label: 'Open' },
  { label: CHANGE_STATUS_LABELS.awaiting_review, status: 'awaiting_review' },
  { label: CHANGE_STATUS_LABELS.quotation_required, status: 'quotation_required' },
  { label: CHANGE_STATUS_LABELS.awaiting_client_approval, status: 'awaiting_client_approval' },
  { label: CHANGE_STATUS_LABELS.in_progress, status: 'in_progress' },
  { label: CHANGE_STATUS_LABELS.completed, status: 'completed' },
];

export default async function ChangeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; mine?: string }>;
}) {
  const session = await requireAgency();
  const { q, status, mine } = await searchParams;

  const requests = await getChangeRequests({
    search: q,
    status: status as Enums<'change_request_status'> | undefined,
    openOnly: !status,
    assignedTo: mine === '1' ? session.userId : undefined,
  });

  return (
    <>
      <PageHeader
        title="Change requests"
        description="Website changes raised by clients, from triage through to completion."
      />

      <div className="mb-4 space-y-3">
        <div className="max-w-md">
          <SearchField label="Search change requests" placeholder="Search by title or reference…" />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((filter) => {
            const active = filter.status ? status === filter.status : !status;
            const href = filter.status
              ? `/change-requests?status=${filter.status}`
              : '/change-requests';
            return (
              <Link
                key={filter.label}
                href={href}
                className={
                  active
                    ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
                    : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }
              >
                {filter.label}
              </Link>
            );
          })}

          <Link
            href={mine === '1' ? '/change-requests' : '/change-requests?mine=1'}
            className={
              mine === '1'
                ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
                : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            }
          >
            Assigned to me
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader title="Requests" description={`${requests.length} shown`} />
        <RequestTable requests={requests as unknown as ChangeRequestListRow[]} />
      </Card>
    </>
  );
}
