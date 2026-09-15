import type { Metadata } from 'next';

import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireClient, getCurrentClientId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Files' };

export default async function PortalFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const session = await requireClient();
  const { project } = await searchParams;

  const clientId = await getCurrentClientId();
  const supabase = await createClient();

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

  const rows = (files ?? []) as unknown as FileRow[];
  const needsAttention = rows.filter(
    (f) => f.approval_status === 'needs_replacement' || f.approval_status === 'rejected',
  );

  const targetProject = project ?? projects?.[0]?.id ?? null;

  return (
    <>
      <PageHeader
        title="Files"
        description="Logos, photographs, documents and anything else you send us."
      />

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
            currentUserId={session.userId}
            isManager={false}
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="All files" description={`${rows.length} in total`} />
        <FileGrid
          files={rows}
          canApprove={false}
          currentUserId={session.userId}
          isManager={false}
        />
      </Card>
    </>
  );
}
