import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { setStageActiveAction, updateStageAction } from '@/lib/actions/settings';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';

export interface StageRow {
  id: string;
  key: string;
  label: string;
  colour: string;
  position: number;
  is_active: boolean;
}

/**
 * Stages are rows, not an enum, so they can be renamed and recoloured here.
 * Deactivating hides a stage from the pickers without disturbing projects
 * already sitting in it.
 */
export function StageList({ stages }: { stages: StageRow[] }) {
  return (
    <Card>
      <CardHeader
        title="Project stages"
        description="The lifecycle every project moves through. Rename or recolour them to match how you work."
      />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {stages.map((stage) => (
          <StageItem key={stage.id} stage={stage} />
        ))}
      </ul>
    </Card>
  );
}

function StageItem({ stage }: { stage: StageRow }) {
  const action = updateStageAction.bind(null, stage.id);
  const [state, formAction] = useFormAction(action);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (state.status === 'success' && editing) setEditing(false);

  if (editing) {
    return (
      <li className="p-5">
        <form action={formAction} className="space-y-3" noValidate>
          <FormMessage state={state} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name" error={state.errors?.label} required className="sm:col-span-2">
              {({ id }) => <Input id={id} name="label" required defaultValue={stage.label} />}
            </Field>
            <Field label="Colour" error={state.errors?.colour} required>
              {({ id }) => <Input id={id} name="colour" defaultValue={stage.colour} />}
            </Field>
            <Field label="Description" className="sm:col-span-3">
              {({ id }) => <Input id={id} name="description" />}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Saving…">
              Save
            </SubmitButton>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="w-6 shrink-0 text-[13px] text-[var(--text-muted)] tabular-nums">
        {stage.position}
      </span>
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: stage.colour }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{stage.label}</span>
        <span className="block font-mono text-[11px] text-[var(--text-muted)]">{stage.key}</span>
      </span>

      {!stage.is_active ? <Badge tone="neutral">Hidden</Badge> : null}

      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await setStageActiveAction(stage.id, !stage.is_active);
            revalidate();
          })
        }
      >
        {stage.is_active ? 'Hide' : 'Show'}
      </Button>
    </li>
  );
}
