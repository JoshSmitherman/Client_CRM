import { CommentThread } from '@/components/comments/comment-thread';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { isAgency } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { getProjectComments } from '@/lib/queries/comments';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

export function ProjectCommentsTab() {
  const { projectId, project } = useProjectWorkspace();
  const { profile, userId } = useAuth();
  const query = useQuery(() => getProjectComments(projectId), [projectId]);

  const client = project.clients as unknown as { id: string };

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader
          title="Project discussion"
          description="Internal notes are highlighted and are never visible to the client."
        />
        <CardBody>
          <QueryBoundary query={query}>
            {(comments) => (
              <CommentThread
                comments={comments}
                entityType="project"
                entityId={projectId}
                projectId={projectId}
                clientId={client.id}
                currentUserId={userId ?? ''}
                canWriteInternal
                isAdmin={profile ? isAgency(profile.role) : false}
              />
            )}
          </QueryBoundary>
        </CardBody>
      </Card>
    </div>
  );
}
