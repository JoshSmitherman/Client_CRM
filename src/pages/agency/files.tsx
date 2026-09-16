import { Link, useSearchParams } from 'react-router-dom';

import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { isAgencyManager } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

type FileWithProject = FileRow & {
  project_id: string | null;
  projects: { id: string; name: string } | null;
};

async function load(q: string | undefined, pendingOnly: boolean) {
  let query = supabase
    .from('files')
    .select(
      `id, file_name, original_name, mime_type, size_bytes, category, description,
       approval_status, review_notes, created_at, uploaded_by, project_id,
       uploader:users!files_uploaded_by_fkey ( full_name ),
       projects ( id, name )`,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // Strip the wildcards a user could otherwise inject into the pattern.
  if (q) query = query.ilike('file_name', `%${q.replace(/[%_]/g, '')}%`);
  if (pendingOnly) query = query.eq('approval_status', 'pending');

  const { data } = await query;
  return (data ?? []) as unknown as FileWithProject[];
}

export function FilesPage() {
  useDocumentTitle('Files');
  const { profile, userId } = useAuth();
  const [params] = useSearchParams();

  const q = params.get('q') ?? undefined;
  const status = params.get('status') ?? undefined;
  const pendingOnly = status === 'pending';

  const query = useQuery(() => load(q, pendingOnly), [q, pendingOnly]);

  return (
    <>
      <PageHeader title="Files" description="Every file across the projects you can see." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-md flex-1">
          <SearchField label="Search files" placeholder="Search by file name…" />
        </div>
        <Link
          to={pendingOnly ? '/files' : '/files?status=pending'}
          className={
            pendingOnly
              ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
              : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }
        >
          Awaiting review
        </Link>
      </div>

      <QueryBoundary query={query}>
        {(rows) => (
          <Card>
            <CardHeader title="All files" description={`${rows.length} shown`} />
            <FileGrid
              files={rows}
              canApprove
              currentUserId={userId ?? ''}
              isManager={profile ? isAgencyManager(profile.role) : false}
            />
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
