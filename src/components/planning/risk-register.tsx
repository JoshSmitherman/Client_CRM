import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { addRiskAction, deleteRiskAction, setRiskStatusAction } from '@/lib/actions/planning';
import type { Tone } from '@/lib/constants';
import { revalidate } from '@/lib/data/revalidate';
import { useFormAction } from '@/lib/data/use-form-action';
import { cn } from '@/lib/utils';

export interface RiskRow {
  id: string;
  title: string;
  description: string | null;
  likelihood: string;
  impact: string;
  mitigation: string | null;
  status: string;
  owner?: { full_name: string } | null;
}

const LEVEL_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'closed', label: 'Closed' },
];

/** Likelihood x impact, so the worst combination reads as danger at a glance. */
function severityTone(likelihood: string, impact: string): Tone {
  const score = (l: string) => (l === 'high' ? 3 : l === 'medium' ? 2 : 1);
  const total = score(likelihood) * score(impact);
  if (total >= 6) return 'danger';
  if (total >= 3) return 'warning';
  return 'neutral';
}

export function RiskRegister({
  projectId,
  risks,
  staff,
}: {
  projectId: string;
  risks: RiskRow[];
  staff: { id: string; full_name: string }[];
}) {
  const action = addRiskAction.bind(null, projectId);
  const [state, formAction] = useFormAction(action);
  const [adding, setAdding] = useState(false);

  const open = risks.filter((r) => r.status === 'open').length;

  return (
    <Card>
      <CardHeader
        title="Risks"
        description={open > 0 ? `${open} still open` : 'Things that could derail the project'}
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
            <Field label="Risk" error={state.errors?.title} required className="sm:col-span-3">
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="title" required aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Likelihood">
              {({ id }) => <Select id={id} name="likelihood" defaultValue="medium" options={LEVEL_OPTIONS} />}
            </Field>
            <Field label="Impact">
              {({ id }) => <Select id={id} name="impact" defaultValue="medium" options={LEVEL_OPTIONS} />}
            </Field>
            <Field label="Owner">
              {({ id }) => (
                <Select
                  id={id}
                  name="ownerId"
                  placeholder="Unassigned"
                  options={staff.map((s) => ({ value: s.id, label: s.full_name || 'Unnamed' }))}
                />
              )}
            </Field>
            <Field label="Mitigation" className="sm:col-span-3">
              {({ id }) => <Textarea id={id} name="mitigation" rows={2} />}
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton size="sm" pendingLabel="Adding…">
              Record risk
            </SubmitButton>
          </div>
        </form>
      ) : null}

      {risks.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No risks recorded"
          description="Worth noting anything that could delay or derail delivery."
        />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {risks.map((risk) => (
            <RiskItem key={risk.id} risk={risk} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RiskItem({ risk }: { risk: RiskRow }) {
  const [isPending, startTransition] = useTransition();
  const resolved = risk.status !== 'open';

  return (
    <li className={cn('px-5 py-3.5', isPending && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('text-[14px] font-medium', resolved && 'text-[var(--text-muted)]')}>
            {risk.title}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={severityTone(risk.likelihood, risk.impact)} dot>
              {risk.likelihood} likelihood · {risk.impact} impact
            </Badge>
            {risk.owner ? (
              <span className="text-[12px] text-[var(--text-muted)]">{risk.owner.full_name}</span>
            ) : null}
          </div>

          {risk.mitigation ? (
            <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
              <span className="font-medium">Mitigation:</span> {risk.mitigation}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <label htmlFor={`risk-status-${risk.id}`} className="sr-only">
            Status for {risk.title}
          </label>
          <select
            id={`risk-status-${risk.id}`}
            value={risk.status}
            disabled={isPending}
            onChange={(e) =>
              startTransition(async () => {
                await setRiskStatusAction(risk.id, e.target.value);
                revalidate();
              })
            }
            className="h-8 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-2 text-[12px]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <form action={async () => { await deleteRiskAction(risk.id); revalidate(); }}>
            <Button variant="ghost" size="icon" type="submit" aria-label={`Delete ${risk.title}`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}
