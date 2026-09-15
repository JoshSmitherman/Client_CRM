import { notFound } from 'next/navigation';

import { RequestTable, type ChangeRequestListRow } from '@/components/change-requests/request-table';
import { Card, CardHeader } from '@/components/ui/card';
import { requireAgency } from '@/lib/auth';
import { getChangeRequests } from '@/lib/queries/change-requests';
import { getProject } from '@/lib/queries/projects';

export default async function ProjectChangesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const requests = await getChangeRequests({ projectId: id });

  return (
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
  );
}
