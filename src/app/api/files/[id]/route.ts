import { NextResponse, type NextRequest } from 'next/server';

import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Download proxy.
 *
 * Object keys are never handed to the browser. This route re-checks access
 * (the SELECT on `files` is RLS-evaluated, so an unauthorised id simply is not
 * found) and then mints a short-lived signed URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: file } = await supabase
    .from('files')
    .select('bucket, storage_path, file_name')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!file) {
    // Deliberately 404 rather than 403: a client should not learn that a file
    // they cannot reach exists.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });

  if (error || !signed) {
    return NextResponse.json({ error: 'Could not prepare the download' }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
