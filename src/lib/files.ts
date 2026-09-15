/**
 * File validation shared by the client-side picker and the Server Action.
 *
 * The browser copy exists for a fast, friendly message; the server copy is the
 * one that matters. Supabase Storage enforces the same MIME allow-list and size
 * cap a third time at the bucket level, so a forged request still fails.
 */
import type { Enums } from '@/lib/supabase/database.types';

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed',
  'font/otf',
  'font/ttf',
  'font/woff',
  'font/woff2',
  'application/postscript',
]);

export const ACCEPT_ATTRIBUTE = [...ALLOWED_MIME_TYPES].join(',');

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateFile(file: { name: string; size: number; type: string }): FileValidationResult {
  if (file.size === 0) {
    return { ok: false, error: `${file.name} is empty.` };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `${file.name} is larger than 100 MB.` };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `${file.name} is a file type we do not accept (${file.type || 'unknown'}).`,
    };
  }
  return { ok: true };
}

/** Best-effort category from the MIME type; the uploader can override it. */
export function categoryForMime(mime: string, fileName: string): Enums<'file_category'> {
  if (mime === 'image/svg+xml' && /logo/i.test(fileName)) return 'logo';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') {
    return 'spreadsheet';
  }
  if (mime.includes('word') || mime.includes('document')) return 'document';
  if (mime.startsWith('font/') || mime === 'application/postscript') return 'brand_asset';
  return 'other';
}

/**
 * Strips directory components and anything awkward from a filename before it
 * becomes part of a storage key.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  return base
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '-')
    .replace(/_{2,}/g, '_')
    .slice(0, 120);
}

/** Object key: projects/<project_id>/<uuid>-<filename>, matched by storage RLS. */
export function storageKey(scope: 'projects' | 'clients', scopeId: string, fileName: string): string {
  return `${scope}/${scopeId}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
}
