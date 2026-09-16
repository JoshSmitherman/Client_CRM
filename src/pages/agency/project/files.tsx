import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { FileUploader } from '@/components/files/file-uploader';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { isAgencyManager } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

async function load(projectId: string) {
  const { data } = await supabase
    .from('files')
    .select(
      `id, file_name, original_name, mime_type, size_bytes, category, description,
       approval_status, review_notes, created_at, uploaded_by,
       uploader:users!files_uploaded_by_fkey ( full_name )`,
    )
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (data ?? []) as unknown as FileRow[];
}

export function ProjectFilesTab() {
  const { projectId, project } = useProjectWorkspace();
  const { profile, userId } = useAuth();
  const query = useQuery(() => load(projectId), [projectId]);

  const client = project.clients as unknown as { id: string };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Upload files"
          description="Images, documents, brand assets and media."
        />
        <CardBody>
          <FileUploader projectId={projectId} clientId={client.id} />
        </CardBody>
      </Card>

      <QueryBoundary query={query}>
        {(rows) => {
          const pending = rows.filter((f) => f.approval_status === 'pending').length;

          return (
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
                currentUserId={userId ?? ''}
                isManager={profile ? isAgencyManager(profile.role) : false}
              />
            </Card>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
