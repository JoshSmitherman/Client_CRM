import {
  RequestTable,
  type ChangeRequestListRow,
} from '@/components/change-requests/request-table';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardHeader } from '@/components/ui/card';
import { useQuery } from '@/lib/data/use-query';
import { getChangeRequests } from '@/lib/queries/change-requests';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

export function ProjectChangesTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => getChangeRequests({ projectId }), [projectId]);

  return (
    <QueryBoundary query={query}>
      {(requests) => (
        <Card>
          <CardHeader
            title="Change requests"
            description={`${requests.length} raised against this project`}
          />
          <RequestTable
            requests={requests as unknown as ChangeRequestListRow[]}
            showClient={false}
            emptyMessage="No change requests have been raised for this project."
          />
        </Card>
      )}
    </QueryBoundary>
  );
}
