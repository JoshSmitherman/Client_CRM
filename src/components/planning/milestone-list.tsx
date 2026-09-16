import { Flag, Plus, Trash2 } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { addMilestoneAction, deleteMilestoneAction, toggleMilestoneAction } from '@/lib/actions/planning';
import { RESPONSIBILITY_LABELS, toOptions } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import { formatDate, isOverdue } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface MilestoneRow {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed_at: string | null;
  owner_side: string;
  depends_on_id: string | null;
}

export function MilestoneList({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: MilestoneRow[];
}) {
  const action = addMilestoneAction.bind(null, projectId);
  const [state, formAction] = useFormAction(action);
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (state.status === 'success' && adding) {
    formRef.current?.reset();
  }

  const complete = milestones.filter((m) => m.completed_at).length;

  return (
    <Card>
      <CardHeader
        title="Milestones"
        description={
          milestones.length > 0
            ? `${complete} of ${milestones.length} reached — this drives the planning progress figure`
            : 'Key checkpoints through the project'
        }
        action={
          <Button size="sm" variant="secondary" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </Button>
        }
      />

      {adding ? (
        <form ref={formRef} action={formAction} className="border-b border-[var(--border-subtle)] p-5" noValidate>
          <FormMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Milestone" error={state.errors?.title} required className="sm:col-span-2">
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="title"
                  required
                  placeholder="e.g. Design approved"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
            <Field label="Target date" error={state.errors?.targetDate}>
              {({ id }) => <Input id={id} name="targetDate" type="date" />}
            </Field>
            <Field label="Owner" error={state.errors?.ownerSide}>
              {({ id }) => (
                <Select id={id} name="ownerSide" defaultValue="agency" options={toOptions(RESPONSIBILITY_LABELS)} />
              )}
            </Field>
            {milestones.length > 0 ? (
              <Field
                label="Depends on"
                hint="The milestone that must come first."
                className="sm:col-span-2"
              >
                {({ id, describedBy }) => (
                  <Select
                    id={id}
                    name="dependsOnId"
                    placeholder="Nothing"
                    aria-describedby={describedBy}
                    options={milestones.map((m) => ({ value: m.id, label: m.title }))}
                  />
                )}
              </Field>
            ) : null}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Add milestone
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {milestones.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No milestones yet"
          description="Add the checkpoints you want to track."
        />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {milestones.map((milestone) => (
            <MilestoneItem key={milestone.id} milestone={milestone} milestones={milestones} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MilestoneItem({
  milestone,
  milestones,
}: {
  milestone: MilestoneRow;
  milestones: MilestoneRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const complete = Boolean(milestone.completed_at);
  const late = isOverdue(milestone.target_date, complete);
  const dependsOn = milestone.depends_on_id
    ? milestones.find((m) => m.id === milestone.depends_on_id)
    : null;

  return (
    <li className={cn('flex items-start gap-3 px-5 py-3', isPending && 'opacity-60')}>
      <input
        type="checkbox"
        checked={complete}
        disabled={isPending}
        onChange={() =>
          startTransition(async () => {
            await toggleMilestoneAction(milestone.id, !complete);
            revalidate();
          })
        }
        aria-label={complete ? `Reopen ${milestone.title}` : `Mark ${milestone.title} reached`}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
      />

      <div className="min-w-0 flex-1">
        <p className={cn('text-[14px] font-medium', complete && 'text-[var(--text-muted)] line-through')}>
          {milestone.title}
        </p>
        <p
          className={cn(
            'text-[12px]',
            late ? 'font-medium text-[var(--danger-text)]' : 'text-[var(--text-muted)]',
          )}
        >
          {complete
            ? `Reached ${formatDate(milestone.completed_at)}`
            : milestone.target_date
              ? `${late ? 'Overdue — was due' : 'Due'} ${formatDate(milestone.target_date)}`
              : 'No target date'}
          {milestone.owner_side === 'client' ? ' · Client' : ''}
          {dependsOn ? ` · after ${dependsOn.title}` : ''}
        </p>
      </div>

      <form action={async () => { await deleteMilestoneAction(milestone.id); revalidate(); }}>
        <Button variant="ghost" size="icon" type="submit" aria-label={`Delete ${milestone.title}`}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </form>
    </li>
  );
}
