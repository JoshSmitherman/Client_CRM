import { useSearchParams } from 'react-router-dom';

import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

async function load() {
  const [{ data: projects }, { data: files }] = await Promise.all([
    supabase.from('projects').select('id, name').is('deleted_at', null).order('name'),
    supabase
      .from('files')
      .select(
        `id, file_name, original_name, mime_type, size_bytes, category, description,
         approval_status, review_notes, created_at, uploaded_by,
         uploader:users!files_uploaded_by_fkey ( full_name )`,
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  return { projects: projects ?? [], files: (files ?? []) as unknown as FileRow[] };
}

export function PortalFilesPage() {
  useDocumentTitle('Files');
  const { clientId, userId } = useAuth();
  const [params] = useSearchParams();
  const project = params.get('project');

  const query = useQuery(load, []);

  return (
    <>
      <PageHeader
        title="Files"
        description="Logos, photographs, documents and anything else you send us."
      />

      <QueryBoundary query={query}>
        {({ projects, files }) => {
          const needsAttention = files.filter(
            (f) =>
              f.approval_status === 'needs_replacement' || f.approval_status === 'rejected',
          );
          const targetProject = project ?? projects[0]?.id ?? null;

          return (
            <>
              {clientId ? (
                <Card className="mb-4">
                  <CardHeader
                    title="Upload"
                    description="Drag files in, or choose them. Up to 100 MB each."
                  />
                  <CardBody>
                    <FileUploader projectId={targetProject} clientId={clientId} />
                  </CardBody>
                </Card>
              ) : null}

              {needsAttention.length > 0 ? (
                <Card className="mb-4">
                  <CardHeader
                    title="We need a different version"
                    description={`${needsAttention.length} file${needsAttention.length === 1 ? '' : 's'} need replacing`}
                  />
                  <FileGrid
                    files={needsAttention}
                    canApprove={false}
                    currentUserId={userId ?? ''}
                    isManager={false}
                  />
                </Card>
              ) : null}

              <Card>
                <CardHeader title="All files" description={`${files.length} in total`} />
                <FileGrid
                  files={files}
                  canApprove={false}
                  currentUserId={userId ?? ''}
                  isManager={false}
                />
              </Card>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
