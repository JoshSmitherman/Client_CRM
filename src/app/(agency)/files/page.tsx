import type { Metadata } from 'next';
import Link from 'next/link';

import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { requireAgency } from '@/lib/auth';
import { isAgencyManager } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Files' };

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireAgency();
  const { q, status } = await searchParams;

  const supabase = await createClient();

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

  if (q) query = query.ilike('file_name', `%${q.replace(/[%_]/g, '')}%`);
  if (status === 'pending') query = query.eq('approval_status', 'pending');

  const { data: files } = await query;
  const rows = (files ?? []) as unknown as (FileRow & {
    project_id: string | null;
    projects: { id: string; name: string } | null;
  })[];

  return (
    <>
      <PageHeader
        title="Files"
        description="Every file across the projects you can see."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-md flex-1">
          <SearchField label="Search files" placeholder="Search by file name…" />
        </div>
        <Link
          href={status === 'pending' ? '/files' : '/files?status=pending'}
          className={
            status === 'pending'
              ? 'rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-text)]'
              : 'rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }
        >
          Awaiting review
        </Link>
      </div>

      <Card>
        <CardHeader title="All files" description={`${rows.length} shown`} />
        <FileGrid
          files={rows}
          canApprove
          currentUserId={session.userId}
          isManager={isAgencyManager(session.profile.role)}
        />
      </Card>
    </>
  );
}
