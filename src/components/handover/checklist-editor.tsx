import { Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { ProgressBar } from '@/components/ui/progress';
import {
  addHandoverItemAction,
  deleteHandoverItemAction,
  setHandoverItemStatusAction,
} from '@/lib/actions/handover';
import { HANDOVER_ITEM_STATUS_LABELS } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

export interface HandoverItemRow {
  id: string;
  title: string;
  description: string | null;
  status: Enums<'handover_item_status'>;
  completed_by: string | null;
}

export function ChecklistEditor({
  checklistId,
  projectId,
  items,
  canEdit,
}: {
  checklistId: string;
  projectId: string;
  items: HandoverItemRow[];
  canEdit: boolean;
}) {
  const action = addHandoverItemAction.bind(null, checklistId, projectId);
  const [state, formAction] = useFormAction(action);
  const [adding, setAdding] = useState(false);

  // "Not applicable" items are excluded from the denominator, the same rule
  // the progress function uses.
  const applicable = items.filter((i) => i.status !== 'not_applicable');
  const complete = applicable.filter((i) => i.status === 'complete').length;
  const percent = applicable.length === 0 ? 0 : Math.round((complete / applicable.length) * 100);

  return (
    <Card>
      <CardHeader
        title="Launch checklist"
        description={`${complete} of ${applicable.length} applicable items complete`}
        action={
          canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add item
            </Button>
          ) : null
        }
      />

      <div className="px-5 pt-4">
        <ProgressBar value={percent} label="Checklist complete" />
      </div>

      {adding ? (
        <form action={formAction} className="border-b border-[var(--border-subtle)] p-5" noValidate>
          <FormMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Item" error={state.errors?.title} required>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="title" required aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Description">
              {({ id }) => <Input id={id} name="description" />}
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add item
            </SubmitButton>
          </div>
        </form>
      ) : null}

      <ul className="mt-4 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
        {items.map((item) => (
          <ChecklistItem key={item.id} item={item} canEdit={canEdit} />
        ))}
      </ul>
    </Card>
  );
}

function ChecklistItem({ item, canEdit }: { item: HandoverItemRow; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(status: Enums<'handover_item_status'>) {
    setError(null);
    startTransition(async () => {
      try {
        await setHandoverItemStatusAction(item.id, status);
        revalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the item.');
      }
    });
  }

  const notApplicable = item.status === 'not_applicable';

  return (
    <li className={cn('flex items-start gap-3 px-5 py-3', isPending && 'opacity-60')}>
      <input
        type="checkbox"
        checked={item.status === 'complete'}
        disabled={!canEdit || isPending || notApplicable}
        onChange={() => set(item.status === 'complete' ? 'pending' : 'complete')}
        aria-label={`Mark ${item.title} complete`}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[14px] font-medium',
            (item.status === 'complete' || notApplicable) && 'text-[var(--text-muted)] line-through',
          )}
        >
          {item.title}
        </p>
        {item.description ? (
          <p className="text-[12px] text-[var(--text-muted)]">{item.description}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>

      {notApplicable ? (
        <Badge tone="neutral">{HANDOVER_ITEM_STATUS_LABELS.not_applicable}</Badge>
      ) : null}

      {canEdit ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => set(notApplicable ? 'pending' : 'not_applicable')}
          >
            {notApplicable ? 'Reinstate' : 'N/A'}
          </Button>
          <form action={async () => { await deleteHandoverItemAction(item.id); revalidate(); }}>
            <Button variant="ghost" size="icon" type="submit" aria-label={`Remove ${item.title}`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
