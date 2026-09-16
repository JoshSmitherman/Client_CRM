import { Package, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import {
  addDeliverableAction,
  deleteDeliverableAction,
  toggleDeliverableAction,
} from '@/lib/actions/planning';
import { RESPONSIBILITY_LABELS, toOptions } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import { formatDate, isOverdue } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface DeliverableRow {
  id: string;
  title: string;
  description: string | null;
  owner_side: string;
  due_date: string | null;
  is_complete: boolean;
}

export function DeliverableList({
  projectId,
  deliverables,
}: {
  projectId: string;
  deliverables: DeliverableRow[];
}) {
  const action = addDeliverableAction.bind(null, projectId);
  const [state, formAction] = useFormAction(action);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Deliverables"
        description="The concrete things being handed over."
        action={
          <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        }
      />

      {adding ? (
        <form action={formAction} className="border-b border-[var(--border-subtle)] p-5" noValidate>
          <FormMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Deliverable" error={state.errors?.title} required className="sm:col-span-3">
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="title" required aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Owner">
              {({ id }) => (
                <Select id={id} name="ownerSide" defaultValue="agency" options={toOptions(RESPONSIBILITY_LABELS)} />
              )}
            </Field>
            <Field label="Due date">
              {({ id }) => <Input id={id} name="dueDate" type="date" />}
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add deliverable
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {deliverables.length === 0 ? (
        <EmptyState icon={Package} title="No deliverables yet" description="List what is being produced." />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {deliverables.map((item) => (
            <DeliverableItem key={item.id} deliverable={item} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function DeliverableItem({ deliverable }: { deliverable: DeliverableRow }) {
  const [isPending, startTransition] = useTransition();
  const late = isOverdue(deliverable.due_date, deliverable.is_complete);

  return (
    <li className={cn('flex items-start gap-3 px-5 py-3', isPending && 'opacity-60')}>
      <input
        type="checkbox"
        checked={deliverable.is_complete}
        disabled={isPending}
        onChange={() =>
          startTransition(async () => {
            await toggleDeliverableAction(deliverable.id, !deliverable.is_complete);
            revalidate();
          })
        }
        aria-label={`Mark ${deliverable.title} ${deliverable.is_complete ? 'incomplete' : 'complete'}`}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[14px] font-medium',
            deliverable.is_complete && 'text-[var(--text-muted)] line-through',
          )}
        >
          {deliverable.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2">
          <Badge tone={deliverable.owner_side === 'client' ? 'accent' : 'neutral'}>
            {deliverable.owner_side === 'client' ? 'Client' : 'Agency'}
          </Badge>
          {deliverable.due_date ? (
            <span
              className={cn(
                'text-[12px]',
                late ? 'font-medium text-[var(--danger-text)]' : 'text-[var(--text-muted)]',
              )}
            >
              {late ? 'Overdue — was due' : 'Due'} {formatDate(deliverable.due_date)}
            </span>
          ) : null}
        </p>
      </div>

      <form action={async () => { await deleteDeliverableAction(deliverable.id); revalidate(); }}>
        <Button variant="ghost" size="icon" type="submit" aria-label={`Delete ${deliverable.title}`}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </form>
    </li>
  );
}
