import { notFound } from 'next/navigation';

import { TicketTable, type SupportListRow } from '@/components/support/ticket-table';
import { Card, CardHeader } from '@/components/ui/card';
import { requireAgency } from '@/lib/auth';
import { getProject } from '@/lib/queries/projects';
import { getSupportRequests } from '@/lib/queries/support';

export default async function ProjectSupportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const tickets = await getSupportRequests({ projectId: id });

  return (
    <Card>
      <CardHeader title="Support tickets" description={`${tickets.length} for this website`} />
      <TicketTable
        tickets={tickets as unknown as SupportListRow[]}
        showClient={false}
        emptyMessage="No support tickets have been raised for this website."
      />
    </Card>
  );
}
