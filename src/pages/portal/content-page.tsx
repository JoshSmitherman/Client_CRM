import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { CommentThread } from '@/components/comments/comment-thread';
import { PageContentForm } from '@/components/content/page-content-form';
import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { PAGE_STATUS_LABELS, PAGE_STATUS_TONES } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { getComments } from '@/lib/queries/comments';
import { getProject } from '@/lib/queries/projects';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string, pageId: string) {
  const project = await getProject(id);
  if (!project) return null;

  const { data: page } = await supabase
    .from('website_pages')
    .select('*')
    .eq('id', pageId)
    .eq('project_id', id)
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

  return { project, page, comments, files };
}

export function PortalPageEditor() {
  const { id = '', pageId = '' } = useParams();
  const { userId } = useAuth();
  const query = useQuery(() => load(id, pageId), [id, pageId]);

  useDocumentTitle(query.data?.page.title ?? 'Page content');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !userId) return <NotFoundPage />;
        const { project, page, comments, files } = data;
        const client = project.clients as unknown as { id: string };

        return (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Link
                to={`/portal/projects/${id}/content`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                All pages
              </Link>
              <Badge tone={PAGE_STATUS_TONES[page.status]} dot>
                {PAGE_STATUS_LABELS[page.status]}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PageContentForm page={page} />
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader
                    title="Images for this page"
                    description="Photos, diagrams or anything else that belongs here."
                  />
                  <CardBody className="space-y-4">
                    <FileUploader
                      projectId={id}
                      clientId={client.id}
                      websitePageId={pageId}
                      compact
                    />
                    <FileGrid
                      files={(files ?? []) as unknown as FileRow[]}
                      canApprove={false}
                      currentUserId={userId}
                      isManager={false}
                    />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Questions?" />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="website_page"
                      entityId={pageId}
                      projectId={id}
                      clientId={client.id}
                      currentUserId={userId}
                      canWriteInternal={false}
                      placeholder="Ask us about this page…"
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
