import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import {
  RequestTable,
  type ChangeRequestListRow,
} from '@/components/change-requests/request-table';
import { QueryBoundary } from '@/components/routing/page-state';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@/lib/data/use-query';
import { getChangeRequests } from '@/lib/queries/change-requests';
import { useDocumentTitle } from '@/lib/use-document-title';

const CLOSED = ['completed', 'rejected', 'cancelled'];

export function PortalRequestsPage() {
  useDocumentTitle('Change requests');
  const query = useQuery(() => getChangeRequests({}, 200), []);

  return (
    <>
      <PageHeader
        title="Change requests"
        description="Changes you have asked us to make to your website."
        actions={
          <Button asChild>
            <Link to="/portal/requests/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Submit a change request
            </Link>
          </Button>
        }
      />

      <QueryBoundary query={query}>
        {(requests) => {
          const open = requests.filter((r) => !CLOSED.includes(r.status));
          const closed = requests.filter((r) => CLOSED.includes(r.status));

          return (
            <div className="space-y-4">
              <Card>
                <CardHeader title="In progress" description={`${open.length} open`} />
                <RequestTable
                  requests={open as unknown as ChangeRequestListRow[]}
                  basePath="/portal/requests"
                  showClient={false}
                  emptyMessage="Nothing in progress. Submit a request whenever you need something changed."
                />
              </Card>

              {closed.length > 0 ? (
                <Card>
                  <CardHeader
                    title="Finished"
                    description={`${closed.length} completed or closed`}
                  />
                  <RequestTable
                    requests={closed as unknown as ChangeRequestListRow[]}
                    basePath="/portal/requests"
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
