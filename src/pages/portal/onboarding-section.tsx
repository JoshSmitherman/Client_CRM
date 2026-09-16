import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { CommentThread } from '@/components/comments/comment-thread';
import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { SectionForm } from '@/components/onboarding/section-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { SECTION_BY_KEY, SECTION_ITEMS } from '@/lib/onboarding-template';
import { getComments } from '@/lib/queries/comments';
import { getOnboarding } from '@/lib/queries/onboarding';
import { getProject } from '@/lib/queries/projects';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string, sectionKey: string) {
  const [project, onboarding] = await Promise.all([getProject(id), getOnboarding(id)]);
  if (!project) return null;

  const section = onboarding.sections.find((s) => s.key === sectionKey);
  const definition = SECTION_BY_KEY.get(sectionKey);
  if (!section || !definition) return null;

  const [comments, { data: files }] = await Promise.all([
    getComments({ entityType: 'onboarding_section', entityId: section.id }),
    supabase
      .from('files')
      .select(
        `id, file_name, original_name, mime_type, size_bytes, category, description,
         approval_status, review_notes, created_at, uploaded_by,
         uploader:users!files_uploaded_by_fkey ( full_name )`,
      )
      .eq('onboarding_section_id', section.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  return { project, onboarding, section, definition, comments, files };
}

export function PortalSectionPage() {
  const { id = '', section: sectionKey = '' } = useParams();
  const { userId } = useAuth();

  useDocumentTitle(SECTION_BY_KEY.get(sectionKey)?.title ?? 'Onboarding');
  const query = useQuery(() => load(id, sectionKey), [id, sectionKey]);

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !userId) return <NotFoundPage />;
        const { project, onboarding, section, definition, comments, files } = data;

        const client = project.clients as unknown as { id: string };
        const index = onboarding.sections.findIndex((s) => s.key === sectionKey);
        const previous = onboarding.sections[index - 1];
        const next = onboarding.sections[index + 1];
        const wantsUploads = Boolean(SECTION_ITEMS[sectionKey]);

        return (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Link
                to={`/portal/projects/${id}/onboarding`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                All sections
              </Link>
              <span className="text-[12px] text-[var(--text-muted)]">
                Section {section.position} of {onboarding.sections.length}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <SectionForm
                  sectionId={section.id}
                  definition={definition}
                  responses={(section.responses ?? {}) as Record<string, unknown>}
                  status={section.status}
                  agencyFeedback={section.agency_feedback}
                />

                <nav
                  className="flex flex-wrap items-center justify-between gap-2"
                  aria-label="Sections"
                >
                  {previous ? (
                    <Link
                      to={`/portal/projects/${id}/onboarding/${previous.key}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      {previous.title}
                    </Link>
                  ) : (
                    <span />
                  )}

                  {next ? (
                    <Link
                      to={`/portal/projects/${id}/onboarding/${next.key}`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      {next.title}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : null}
                </nav>
              </div>

              <div className="space-y-4">
                {wantsUploads ? (
                  <Card>
                    <CardHeader
                      title="Files for this section"
                      description={
                        SECTION_ITEMS[sectionKey]
                          ? `We are looking for: ${SECTION_ITEMS[sectionKey].map((i) => i.label).join(', ')}.`
                          : undefined
                      }
                    />
                    <CardBody className="space-y-4">
                      <FileUploader
                        projectId={id}
                        clientId={client.id}
                        onboardingSectionId={section.id}
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
                ) : null}

                <Card>
                  <CardHeader title="Questions?" description="Ask us about this section." />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="onboarding_section"
                      entityId={section.id}
                      projectId={id}
                      clientId={client.id}
                      currentUserId={userId}
                      canWriteInternal={false}
                      placeholder="Not sure what we mean? Ask here…"
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
