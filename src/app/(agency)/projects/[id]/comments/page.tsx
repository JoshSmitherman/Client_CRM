import { notFound } from 'next/navigation';

import { CommentThread } from '@/components/comments/comment-thread';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { requireAgency } from '@/lib/auth';
import { getProjectComments } from '@/lib/queries/comments';
import { getProject } from '@/lib/queries/projects';

export default async function ProjectCommentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const comments = await getProjectComments(id);
  const client = project.clients as unknown as { id: string };

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader
          title="Project discussion"
          description="Internal notes are highlighted and are never visible to the client."
        />
        <CardBody>
          <CommentThread
            comments={comments}
            entityType="project"
            entityId={id}
            projectId={id}
            clientId={client.id}
            currentUserId={session.userId}
            canWriteInternal
            isAdmin={session.profile.role === 'agency_admin'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
