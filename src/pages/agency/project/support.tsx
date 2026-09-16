import { QueryBoundary } from '@/components/routing/page-state';
import { TicketTable, type SupportListRow } from '@/components/support/ticket-table';
import { Card, CardHeader } from '@/components/ui/card';
import { useQuery } from '@/lib/data/use-query';
import { getSupportRequests } from '@/lib/queries/support';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

export function ProjectSupportTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => getSupportRequests({ projectId }), [projectId]);

  return (
    <QueryBoundary query={query}>
      {(tickets) => (
        <Card>
          <CardHeader title="Support tickets" description={`${tickets.length} for this website`} />
          <TicketTable
            tickets={tickets as unknown as SupportListRow[]}
            showClient={false}
            emptyMessage="No support tickets have been raised for this website."
          />
        </Card>
      )}
    </QueryBoundary>
  );
}
