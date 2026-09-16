import { supabase } from '@/lib/supabase/client';

/**
 * Turns a file id into a short-lived download URL.
 *
 * Object keys are never rendered into the page. Reading the row is evaluated
 * against Row Level Security, so an id the viewer may not reach simply is not
 * found — and minting the signed URL is checked again by the storage policy.
 * The previous server route did exactly this; without a server, the browser
 * makes the same two checked calls itself.
 */
export async function signedDownloadUrl(fileId: string): Promise<string> {
  const { data: file } = await supabase
    .from('files')
    .select('bucket, storage_path, file_name')
    .eq('id', fileId)
    .is('deleted_at', null)
    .maybeSingle();

  // Deliberately the same message whether the file is missing or merely out of
  // reach: a client should not learn that a file they cannot see exists.
  if (!file) throw new Error('That file could not be found.');

  const { data: signed, error } = await supabase.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });

  if (error || !signed) throw new Error('Could not prepare the download.');
  return signed.signedUrl;
}
