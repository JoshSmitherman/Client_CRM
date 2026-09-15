import Link from 'next/link';
import { FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import {
  BILLING_TREATMENT_LABELS,
  BILLING_TREATMENT_TONES,
  CHANGE_CATEGORY_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
} from '@/lib/constants';
import { formatCurrency, formatDate, formatRelative } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';

export interface ChangeRequestListRow {
  id: string;
  reference: string;
  title: string;
  category: Enums<'change_request_category'>;
  status: Enums<'change_request_status'>;
  priority: Enums<'task_priority'>;
  billing_treatment: Enums<'billing_treatment'> | null;
  submitted_at: string;
  estimated_completion_date: string | null;
  estimated_cost: number | null;
  clients?: { id: string; company_name: string } | null;
  projects?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string } | null;
}

export function RequestTable({
  requests,
  basePath = '/change-requests',
  showClient = true,
  emptyMessage = 'No change requests match these filters.',
}: {
  requests: ChangeRequestListRow[];
  basePath?: string;
  showClient?: boolean;
  emptyMessage?: string;
}) {
  if (requests.length === 0) {
    return <EmptyState icon={FileText} title="No change requests" description={emptyMessage} />;
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Request</Th>
            {showClient ? <Th>Client</Th> : null}
            <Th>Status</Th>
            <Th>Cover</Th>
            <Th>Priority</Th>
            <Th>Target</Th>
            <Th>Raised</Th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <Tr key={request.id}>
              <Td>
                <Link
                  href={`${basePath}/${request.id}`}
                  className="font-medium hover:text-[var(--accent-text)] hover:underline"
                >
                  {request.title}
                </Link>
                <span className="block text-[12px] text-[var(--text-muted)]">
                  <span className="font-mono">{request.reference}</span> ·{' '}
                  {CHANGE_CATEGORY_LABELS[request.category]}
                  {request.projects ? ` · ${request.projects.name}` : ''}
                </span>
              </Td>

              {showClient ? (
                <Td className="text-[13px]">
                  {request.clients ? (
                    <Link
                      href={`/clients/${request.clients.id}`}
                      className="hover:text-[var(--accent-text)] hover:underline"
                    >
                      {request.clients.company_name}
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </Td>
              ) : null}

              <Td>
                <Badge tone={CHANGE_STATUS_TONES[request.status]} dot>
                  {CHANGE_STATUS_LABELS[request.status]}
                </Badge>
              </Td>

              <Td>
                {request.billing_treatment ? (
                  <span className="flex flex-col gap-1">
                    <Badge tone={BILLING_TREATMENT_TONES[request.billing_treatment]}>
                      {BILLING_TREATMENT_LABELS[request.billing_treatment]}
                    </Badge>
                    {request.estimated_cost ? (
                      <span className="text-[12px] tabular-nums text-[var(--text-muted)]">
                        {formatCurrency(request.estimated_cost)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--text-muted)]">Not assessed</span>
                )}
              </Td>

              <Td>
                <Badge tone={PRIORITY_TONES[request.priority]}>
                  {PRIORITY_LABELS[request.priority]}
                </Badge>
              </Td>

              <Td className="text-[13px] whitespace-nowrap">
                {request.estimated_completion_date ? (
                  formatDate(request.estimated_completion_date)
                ) : (
                  <span className="text-[var(--text-muted)]">—</span>
                )}
              </Td>

              <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                {formatRelative(request.submitted_at)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}
