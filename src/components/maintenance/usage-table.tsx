import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatDate, formatDuration } from '@/lib/format';

export interface UsageRow {
  id: string;
  usage_type: string;
  minutes: number;
  description: string;
  occurred_on: string;
  is_manual_adjustment: boolean;
  recorder?: { full_name: string } | null;
  change_requests?: { id: string; reference: string; title: string } | null;
  support_requests?: { id: string; reference: string; subject: string } | null;
}

export function UsageTable({
  usage,
  linkBase = '',
}: {
  usage: UsageRow[];
  /** '' for the client portal, where request detail lives elsewhere. */
  linkBase?: string;
}) {
  if (usage.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No time recorded yet"
        description="Work logged against this plan will appear here."
      />
    );
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>What was done</Th>
            <Th>Type</Th>
            <Th className="text-right">Time</Th>
          </tr>
        </thead>
        <tbody>
          {usage.map((row) => (
            <Tr key={row.id}>
              <Td className="text-[13px] whitespace-nowrap">{formatDate(row.occurred_on)}</Td>

              <Td>
                <span className="text-[13px]">{row.description}</span>
                {row.change_requests ? (
                  <span className="block text-[12px] text-[var(--text-muted)]">
                    {linkBase ? (
                      <Link
                        to={`${linkBase}/${row.change_requests.id}`}
                        className="font-mono hover:underline"
                      >
                        {row.change_requests.reference}
                      </Link>
                    ) : (
                      <span className="font-mono">{row.change_requests.reference}</span>
                    )}
                  </span>
                ) : null}
                {row.support_requests ? (
                  <span className="block font-mono text-[12px] text-[var(--text-muted)]">
                    {row.support_requests.reference}
                  </span>
                ) : null}
                {row.is_manual_adjustment ? (
                  <Badge tone="neutral" className="mt-1">
                    Manual adjustment
                    {row.recorder ? ` · ${row.recorder.full_name}` : ''}
                  </Badge>
                ) : null}
              </Td>

              <Td>
                <Badge tone={row.usage_type === 'change' ? 'info' : 'accent'}>
                  {row.usage_type === 'change' ? 'Website change' : 'Support'}
                </Badge>
              </Td>

              <Td
                className={`text-right text-[13px] font-medium tabular-nums ${
                  row.minutes < 0 ? 'text-[var(--success-text)]' : ''
                }`}
              >
                {formatDuration(row.minutes)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}
