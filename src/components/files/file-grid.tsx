import {
  Check,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useState, useTransition } from 'react';

import { DownloadButton } from '@/components/files/download-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteFileAction, setFileApprovalAction } from '@/lib/actions/files';
import { FILE_APPROVAL_LABELS, FILE_APPROVAL_TONES, FILE_CATEGORY_LABELS } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { formatDate, formatFileSize } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';

export interface FileRow {
  id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: Enums<'file_category'>;
  description: string | null;
  approval_status: Enums<'file_approval_status'>;
  review_notes: string | null;
  created_at: string;
  uploaded_by: string | null;
  uploader?: { full_name: string } | null;
}

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Video;
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') {
    return FileSpreadsheet;
  }
  return FileText;
}

export function FileGrid({
  files,
  canApprove,
  currentUserId,
  isManager,
}: {
  files: FileRow[];
  canApprove: boolean;
  currentUserId: string;
  isManager: boolean;
}) {
  if (files.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No files yet"
        description="Uploaded files will appear here with their approval status."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          canApprove={canApprove}
          canDelete={isManager || file.uploaded_by === currentUserId}
        />
      ))}
    </ul>
  );
}

function FileItem({
  file,
  canApprove,
  canDelete,
}: {
  file: FileRow;
  canApprove: boolean;
  canDelete: boolean;
}) {
  const Icon = iconFor(file.mime_type);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState('');

  function decide(status: Enums<'file_approval_status'>, reason?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setFileApprovalAction(file.id, status, reason);
        revalidate();
        setRejecting(false);
        setNotes('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the file.');
      }
    });
  }

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)]">
          <Icon className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium">{file.file_name}</p>
          {file.description ? (
            <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{file.description}</p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={FILE_APPROVAL_TONES[file.approval_status]} dot>
              {FILE_APPROVAL_LABELS[file.approval_status]}
            </Badge>
            <span className="text-[12px] text-[var(--text-muted)]">
              {FILE_CATEGORY_LABELS[file.category]} · {formatFileSize(file.size_bytes)} ·{' '}
              {formatDate(file.created_at)}
              {file.uploader ? ` · ${file.uploader.full_name}` : ''}
            </span>
          </div>

          {file.review_notes ? (
            <p className="mt-1.5 rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
              <span className="font-medium">Agency feedback:</span> {file.review_notes}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-1 text-[12px] text-[var(--danger-text)]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Object keys are never rendered; the URL is minted on click. */}
          <DownloadButton fileId={file.id} label={file.file_name} />

          {canDelete ? (
            <form action={async () => { await deleteFileAction(file.id); revalidate(); }}>
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                aria-label={`Delete ${file.file_name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {canApprove && file.approval_status !== 'approved' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => decide('approved')}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setRejecting((v) => !v)}
            aria-expanded={rejecting}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Needs replacement
          </Button>
        </div>
      ) : null}

      {rejecting ? (
        <div className="mt-2 space-y-2 pl-12">
          <label htmlFor={`reject-${file.id}`} className="block text-[12px] font-medium">
            What needs to change? <span className="text-[var(--danger)]">*</span>
          </label>
          <textarea
            id={`reject-${file.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            required
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm"
            placeholder="e.g. Please send a vector version of the logo."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending || !notes.trim()}
              onClick={() => decide('needs_replacement', notes)}
            >
              Send feedback
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
