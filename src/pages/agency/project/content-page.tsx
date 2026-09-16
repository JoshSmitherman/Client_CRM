import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { CommentThread } from '@/components/comments/comment-thread';
import { PageContentForm } from '@/components/content/page-content-form';
import { PageReview } from '@/components/content/page-review';
import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { PAGE_STATUS_LABELS, PAGE_STATUS_TONES } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatRelative } from '@/lib/format';
import { isAgencyManager } from '@/lib/permissions';
import { getComments } from '@/lib/queries/comments';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';
import { NotFoundPage } from '@/pages/not-found';

async function load(projectId: string, pageId: string) {
  const { data: page } = await supabase
    .from('website_pages')
    .select('*')
    .eq('id', pageId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!page) return null;

  const [comments, { data: files }] = await Promise.all([
    getComments({ entityType: 'website_page', entityId: pageId }),
    supabase
      .from('files')
      .select(
        `id, file_name, original_name, mime_type, size_bytes, category, description,
         approval_status, review_notes, created_at, uploaded_by,
         uploader:users!files_uploaded_by_fkey ( full_name )`,
      )
      .eq('website_page_id', pageId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  return { page, comments, files };
}

export function ProjectPageEditor() {
  const { projectId, project } = useProjectWorkspace();
  const { pageId = '' } = useParams();
  const { profile, userId } = useAuth();

  const query = useQuery(() => load(projectId, pageId), [projectId, pageId]);
  const client = project.clients as unknown as { id: string };

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !profile || !userId) return <NotFoundPage />;
        const { page, comments, files } = data;

        return (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Link
                to={`/projects/${projectId}/content`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to the sitemap
              </Link>

              <div className="flex items-center gap-2">
                <Badge tone={PAGE_STATUS_TONES[page.status]} dot>
                  {PAGE_STATUS_LABELS[page.status]}
                </Badge>
                {page.submitted_at ? (
                  <span className="text-[12px] text-[var(--text-muted)]">
                    Submitted {formatRelative(page.submitted_at)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PageContentForm page={page} />
              </div>

              <div className="space-y-4">
                <PageReview pageId={pageId} status={page.status} />

                <Card>
                  <CardHeader title="Images for this page" />
                  <CardBody className="space-y-4">
                    <FileUploader
                      projectId={projectId}
                      clientId={client.id}
                      websitePageId={pageId}
                      compact
                    />
                    <FileGrid
                      files={(files ?? []) as unknown as FileRow[]}
                      canApprove
                      currentUserId={userId}
                      isManager={isAgencyManager(profile.role)}
                    />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Discussion" />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="website_page"
                      entityId={pageId}
                      projectId={projectId}
                      clientId={client.id}
                      currentUserId={userId}
                      canWriteInternal
                      isAdmin={profile.role === 'agency_admin'}
                      placeholder="Ask a question about this page…"
                    />
                  </CardBody>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </QueryBoundary>
  );
}
