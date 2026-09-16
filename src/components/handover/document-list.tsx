import { BookOpen, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { DownloadButton } from '@/components/files/download-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { addHandoverDocumentAction, deleteHandoverDocumentAction } from '@/lib/actions/handover';
import { HANDOVER_DOC_TYPE_LABELS } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import { ACCEPT_ATTRIBUTE } from '@/lib/files';

export interface HandoverDocumentRow {
  id: string;
  title: string;
  doc_type: string;
  description: string | null;
  external_url: string | null;
  visible_to_client: boolean;
  file_id: string | null;
}

/** Stays available to the client indefinitely after the project completes. */
export function DocumentList({
  handoverId,
  projectId,
  documents,
  canEdit,
}: {
  handoverId: string;
  projectId: string;
  documents: HandoverDocumentRow[];
  canEdit: boolean;
}) {
  const action = addHandoverDocumentAction.bind(null, handoverId, projectId);
  const [state, formAction] = useFormAction(action);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Documentation and training"
        description="Guides, videos and reference material the client keeps."
        action={
          canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add
            </Button>
          ) : null
        }
      />

      {adding ? (
        <form action={formAction} className="border-b border-[var(--border-subtle)] p-5" noValidate>
          <FormMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" error={state.errors?.title} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="title" required aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>

            <Field label="Type">
              {({ id }) => (
                <Select
                  id={id}
                  name="docType"
                  defaultValue="documentation"
                  options={Object.entries(HANDOVER_DOC_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              )}
            </Field>

            <Field label="Description" className="sm:col-span-2">
              {({ id }) => <Input id={id} name="description" />}
            </Field>

            <Field label="Upload a file" hint="Or paste a link instead.">
              {({ id, describedBy }) => (
                <input
                  id={id}
                  name="file"
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  aria-describedby={describedBy}
                  className="w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:px-3 file:py-2 file:text-[13px]"
                />
              )}
            </Field>

            <Field label="Link" error={state.errors?.externalUrl}>
              {({ id }) => (
                <Input id={id} name="externalUrl" placeholder="https://… (e.g. a training video)" />
              )}
            </Field>

            <div className="sm:col-span-2">
              <Checkbox
                name="visibleToClient"
                defaultChecked
                label="Visible to the client"
                description="Untick for material that is internal only."
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add document
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No documents yet"
          description={
            canEdit
              ? 'Add the guides and training material the client should keep.'
              : 'Your agency has not added any documentation yet.'
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{doc.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {HANDOVER_DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  </Badge>
                  {!doc.visible_to_client ? <Badge tone="warning">Internal only</Badge> : null}
                </p>
                {doc.description ? (
                  <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{doc.description}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {doc.file_id ? <DownloadButton fileId={doc.file_id} label={doc.title} /> : null}
                {doc.external_url ? (
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={doc.external_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open ${doc.title}`}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
                {canEdit ? (
                  <form action={async () => { await deleteHandoverDocumentAction(doc.id); revalidate(); }}>
                    <Button variant="ghost" size="icon" type="submit" aria-label={`Remove ${doc.title}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
