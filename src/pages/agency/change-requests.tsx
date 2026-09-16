import { Link, useSearchParams } from 'react-router-dom';

import {
  RequestTable,
  type ChangeRequestListRow,
} from '@/components/change-requests/request-table';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { useAuth } from '@/lib/auth-context';
import { CHANGE_STATUS_LABELS } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { getChangeRequests } from '@/lib/queries/change-requests';
import type { Enums } from '@/lib/supabase/database.types';
import { useDocumentTitle } from '@/lib/use-document-title';

const QUICK_FILTERS: { label: string; status?: Enums<'change_request_status'> }[] = [
  { label: 'Open' },
  { label: CHANGE_STATUS_LABELS.awaiting_review, status: 'awaiting_review' },
  { label: CHANGE_STATUS_LABELS.quotation_required, status: 'quotation_required' },
  { label: CHANGE_STATUS_LABELS.awaiting_client_approval, status: 'awaiting_client_approval' },
  { label: CHANGE_STATUS_LABELS.in_progress, status: 'in_progress' },
  { label: CHANGE_STATUS_LABELS.completed, status: 'completed' },
];

const chip = (active: boolean) =>
  active
    ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
    : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]';

export function ChangeRequestsPage() {
  useDocumentTitle('Change requests');
  const { userId } = useAuth();
  const [params] = useSearchParams();

  const q = params.get('q') ?? undefined;
  const status = params.get('status') ?? undefined;
  const mine = params.get('mine');

  const query = useQuery(
    () =>
      getChangeRequests({
        search: q,
        status: status as Enums<'change_request_status'> | undefined,
        openOnly: !status,
        assignedTo: mine === '1' ? (userId ?? undefined) : undefined,
      }),
    [q, status, mine, userId],
  );

  return (
    <>
      <PageHeader
        title="Change requests"
        description="Website changes raised by clients, from triage through to completion."
      />

      <div className="mb-4 space-y-3">
        <div className="max-w-md">
          <SearchField
            label="Search change requests"
            placeholder="Search by title or reference…"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((filter) => (
            <Link
              key={filter.label}
              to={
                filter.status ? `/change-requests?status=${filter.status}` : '/change-requests'
              }
              className={chip(filter.status ? status === filter.status : !status)}
            >
              {filter.label}
            </Link>
          ))}

          <Link
            to={mine === '1' ? '/change-requests' : '/change-requests?mine=1'}
            className={chip(mine === '1')}
          >
            Assigned to me
          </Link>
        </div>
      </div>

      <QueryBoundary query={query}>
        {(requests) => (
          <Card>
            <CardHeader title="Requests" description={`${requests.length} shown`} />
            <RequestTable requests={requests as unknown as ChangeRequestListRow[]} />
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
