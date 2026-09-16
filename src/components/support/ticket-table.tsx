import { Link } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
  URGENCY_LABELS,
  URGENCY_TONES,
} from '@/lib/constants';
import { formatRelative } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';

export interface SupportListRow {
  id: string;
  reference: string;
  subject: string;
  category: Enums<'support_category'>;
  status: Enums<'support_status'>;
  urgency: Enums<'urgency'>;
  covered_by_plan: boolean | null;
  submitted_at: string;
  clients?: { id: string; company_name: string } | null;
  projects?: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string } | null;
}

export function TicketTable({
  tickets,
  basePath = '/support',
  showClient = true,
  emptyMessage = 'No support tickets match these filters.',
}: {
  tickets: SupportListRow[];
  basePath?: string;
  showClient?: boolean;
  emptyMessage?: string;
}) {
  if (tickets.length === 0) {
    return <EmptyState icon={LifeBuoy} title="No support tickets" description={emptyMessage} />;
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Ticket</Th>
            {showClient ? <Th>Client</Th> : null}
            <Th>Urgency</Th>
            <Th>Status</Th>
            <Th>Cover</Th>
            <Th>Assigned</Th>
            <Th>Raised</Th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <Tr key={ticket.id}>
              <Td>
                <Link
                  to={`${basePath}/${ticket.id}`}
                  className="font-medium hover:text-[var(--accent-text)] hover:underline"
                >
                  {ticket.subject}
                </Link>
                <span className="block text-[12px] text-[var(--text-muted)]">
                  <span className="font-mono">{ticket.reference}</span> ·{' '}
                  {SUPPORT_CATEGORY_LABELS[ticket.category]}
                </span>
              </Td>

              {showClient ? (
                <Td className="text-[13px]">
                  {ticket.clients ? (
                    <Link
                      to={`/clients/${ticket.clients.id}`}
                      className="hover:text-[var(--accent-text)] hover:underline"
                    >
                      {ticket.clients.company_name}
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </Td>
              ) : null}

              <Td>
                <Badge tone={URGENCY_TONES[ticket.urgency]} dot>
                  {URGENCY_LABELS[ticket.urgency]}
                </Badge>
              </Td>

              <Td>
                <Badge tone={SUPPORT_STATUS_TONES[ticket.status]}>
                  {SUPPORT_STATUS_LABELS[ticket.status]}
                </Badge>
              </Td>

              <Td>
                {ticket.covered_by_plan === null ? (
                  <span className="text-[12px] text-[var(--text-muted)]">Not assessed</span>
                ) : ticket.covered_by_plan ? (
                  <Badge tone="success">Covered</Badge>
                ) : (
                  <Badge tone="warning">Chargeable</Badge>
                )}
              </Td>

              <Td className="text-[13px]">
                {ticket.assignee?.full_name ?? (
                  <span className="text-[var(--text-muted)]">Unassigned</span>
                )}
              </Td>

              <Td className="text-[12px] whitespace-nowrap text-[var(--text-muted)]">
                {formatRelative(ticket.submitted_at)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}
