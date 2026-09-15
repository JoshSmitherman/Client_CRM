import { notFound } from 'next/navigation';

import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { requireAgency } from '@/lib/auth';
import { isAgencyManager } from '@/lib/permissions';
import { getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export default async function ProjectFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const client = project.clients as unknown as { id: string };
  const supabase = await createClient();

  const { data: files } = await supabase
    .from('files')
    .select(
      `id, file_name, original_name, mime_type, size_bytes, category, description,
       approval_status, review_notes, created_at, uploaded_by,
       uploader:users!files_uploaded_by_fkey ( full_name )`,
    )
    .eq('project_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const rows = (files ?? []) as unknown as FileRow[];
  const pending = rows.filter((f) => f.approval_status === 'pending').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Upload files" description="Images, documents, brand assets and media." />
        <CardBody>
          <FileUploader projectId={id} clientId={client.id} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Media library"
          description={
            pending > 0
              ? `${rows.length} files · ${pending} awaiting review`
              : `${rows.length} file${rows.length === 1 ? '' : 's'}`
          }
        />
        <FileGrid
          files={rows}
          canApprove
          currentUserId={session.userId}
          isManager={isAgencyManager(session.profile.role)}
        />
      </Card>
    </div>
  );
}
