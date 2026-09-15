'use client';

import { Paperclip, Upload, X } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { uploadFilesAction } from '@/lib/actions/files';
import { idleState } from '@/lib/actions/types';
import { FILE_CATEGORY_LABELS, toOptions } from '@/lib/constants';
import { ACCEPT_ATTRIBUTE, validateFile } from '@/lib/files';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';

export function FileUploader({
  projectId,
  clientId,
  onboardingSectionId,
  websitePageId,
  compact = false,
}: {
  projectId?: string | null;
  clientId: string;
  onboardingSectionId?: string;
  websitePageId?: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState(uploadFilesAction, idleState);
  const [selected, setSelected] = useState<File[]>([]);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      setSelected([]);
      setLocalErrors([]);
      formRef.current?.reset();
    }
  }, [state.status]);

  /** Same checks the server runs, purely so the message arrives instantly. */
  function accept(files: FileList | null) {
    if (!files) return;
    const ok: File[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const result = validateFile(file);
      if (result.ok) ok.push(file);
      else errors.push(result.error ?? `${file.name} was rejected.`);
    }

    setSelected((prev) => [...prev, ...ok]);
    setLocalErrors(errors);
  }

  // Keep the real <input type="file"> in sync with the visible list, so the
  // form submits exactly what the user sees.
  function syncInput(files: File[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    inputRef.current.files = transfer.files;
  }

  useEffect(() => {
    syncInput(selected);
  }, [selected]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
      <input type="hidden" name="clientId" value={clientId} />
      {onboardingSectionId ? (
        <input type="hidden" name="onboardingSectionId" value={onboardingSectionId} />
      ) : null}
      {websitePageId ? <input type="hidden" name="websitePageId" value={websitePageId} /> : null}

      <FormMessage state={state} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed px-5 text-center transition-colors',
          compact ? 'py-5' : 'py-8',
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-[var(--border-strong)] bg-[var(--surface-sunken)]',
        )}
      >
        <Upload className="mx-auto h-5 w-5 text-[var(--text-muted)]" aria-hidden="true" />

        <label
          htmlFor={`file-input-${onboardingSectionId ?? websitePageId ?? projectId ?? 'main'}`}
          className="mt-2 block cursor-pointer text-[13px] font-medium text-[var(--accent-text)] hover:underline"
        >
          Choose files
          <span className="font-normal text-[var(--text-secondary)]"> or drag them here</span>
        </label>

        <input
          ref={inputRef}
          id={`file-input-${onboardingSectionId ?? websitePageId ?? projectId ?? 'main'}`}
          type="file"
          name="files"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={(e) => accept(e.target.files)}
          className="sr-only"
        />

        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
          Images, video, PDFs, Office documents and brand files. Up to 100 MB each.
        </p>
      </div>

      {localErrors.length > 0 ? (
        <ul role="alert" className="space-y-1">
          {localErrors.map((error) => (
            <li key={error} className="text-[12px] text-[var(--danger-text)]">
              {error}
            </li>
          ))}
        </ul>
      ) : null}

      {selected.length > 0 ? (
        <>
          <ul className="space-y-1.5">
            {selected.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-lg bg-[var(--surface-sunken)] px-3 py-2"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px]">{file.name}</span>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove ${file.name}`}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">
              {({ id }) => (
                <Select
                  id={id}
                  name="category"
                  placeholder="Detect automatically"
                  options={toOptions(FILE_CATEGORY_LABELS)}
                />
              )}
            </Field>
            <Field label="Description">
              {({ id }) => <Input id={id} name="description" placeholder="Optional" />}
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
            <SubmitButton pendingLabel="Uploading…">
              Upload {selected.length} file{selected.length === 1 ? '' : 's'}
            </SubmitButton>
          </div>
        </>
      ) : null}
    </form>
  );
}
