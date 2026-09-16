import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { TicketTable, type SupportListRow } from '@/components/support/ticket-table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@/lib/data/use-query';
import { getSupportRequests } from '@/lib/queries/support';
import { useDocumentTitle } from '@/lib/use-document-title';

const CLOSED = ['resolved', 'closed'];

export function PortalSupportPage() {
  useDocumentTitle('Support');
  const query = useQuery(() => getSupportRequests({}, 200), []);

  return (
    <>
      <PageHeader
        title="Support"
        description="Faults and urgent problems with your website."
        actions={
          <Button asChild>
            <Link to="/portal/support/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Raise a support request
            </Link>
          </Button>
        }
      />

      <QueryBoundary query={query}>
        {(tickets) => {
          const open = tickets.filter((t) => !CLOSED.includes(t.status));
          const closed = tickets.filter((t) => CLOSED.includes(t.status));

          return (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Open tickets" description={`${open.length} being worked on`} />
                <TicketTable
                  tickets={open as unknown as SupportListRow[]}
                  basePath="/portal/support"
                  showClient={false}
                  emptyMessage="No open tickets. Raise one if something is not working."
                />
              </Card>

              {closed.length > 0 ? (
                <Card>
                  <CardHeader title="Resolved" description={`${closed.length} closed`} />
                  <TicketTable
                    tickets={closed as unknown as SupportListRow[]}
                    basePath="/portal/support"
                    showClient={false}
                  />
                </Card>
              ) : null}
            </div>
          );
        }}
      </QueryBoundary>
    </>
  );
}
