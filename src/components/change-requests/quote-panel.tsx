'use client';

import { useActionState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { offerQuoteAction } from '@/lib/actions/change-requests';
import { idleState } from '@/lib/actions/types';
import { BILLING_TREATMENT_LABELS, QUOTE_DECISION_LABELS, toOptions } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

export interface QuoteRow {
  id: string;
  quoted_hours: number | null;
  quoted_cost: number | null;
  quote_notes: string | null;
  proposed_completion_date: string | null;
  billing_treatment: keyof typeof BILLING_TREATMENT_LABELS;
  offered_at: string;
  decision: keyof typeof QUOTE_DECISION_LABELS;
  decided_at: string | null;
  decision_notes: string | null;
  offered_by_user?: { full_name: string } | null;
  decided_by_user?: { full_name: string } | null;
}

/** Agency side: issue a quotation and review the history of previous offers. */
export function QuotePanel({ requestId, quotes }: { requestId: string; quotes: QuoteRow[] }) {
  const action = offerQuoteAction.bind(null, requestId);
  const [state, formAction] = useActionState(action, idleState);
  const e = state.errors ?? {};

  const pending = quotes.find((q) => q.decision === 'pending');

  return (
    <Card>
      <CardHeader
        title="Quotation"
        description="Each offer is kept, so the full approval history is preserved."
      />

      {quotes.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {quotes.map((quote) => (
            <li key={quote.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-semibold tabular-nums">
                  {formatCurrency(quote.quoted_cost)}
                  <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">
                    {quote.quoted_hours} hour{quote.quoted_hours === 1 ? '' : 's'}
                  </span>
                </span>
                <Badge
                  tone={
                    quote.decision === 'approved'
                      ? 'success'
                      : quote.decision === 'rejected'
                        ? 'danger'
                        : quote.decision === 'pending'
                          ? 'warning'
                          : 'info'
                  }
                  dot
                >
                  {QUOTE_DECISION_LABELS[quote.decision]}
                </Badge>
              </div>

              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {BILLING_TREATMENT_LABELS[quote.billing_treatment]} · offered{' '}
                {formatDateTime(quote.offered_at)}
                {quote.offered_by_user ? ` by ${quote.offered_by_user.full_name}` : ''}
                {quote.proposed_completion_date
                  ? ` · proposed ${formatDate(quote.proposed_completion_date)}`
                  : ''}
              </p>

              {quote.quote_notes ? (
                <p className="mt-1.5 text-[13px] whitespace-pre-wrap text-[var(--text-secondary)]">
                  {quote.quote_notes}
                </p>
              ) : null}

              {quote.decision_notes ? (
                <p className="mt-1.5 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[12px]">
                  <span className="font-medium">
                    {quote.decided_by_user?.full_name ?? 'The client'} responded
                    {quote.decided_at ? ` ${formatDateTime(quote.decided_at)}` : ''}:
                  </span>{' '}
                  {quote.decision_notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form action={formAction} noValidate>
        <CardBody className="grid gap-4 border-t border-[var(--border-subtle)] sm:grid-cols-2">
          <FormMessage state={state} />

          {pending ? (
            <p className="text-[12px] text-[var(--warning-text)] sm:col-span-2">
              An offer is already with the client. Saving a new one supersedes it.
            </p>
          ) : null}

          <Field label="Estimated hours" error={e.quotedHours} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="quotedHours"
                type="number"
                step="0.25"
                min="0"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Estimated cost" error={e.quotedCost} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="quotedCost"
                type="number"
                step="0.01"
                min="0"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Cover" error={e.billingTreatment} required>
            {({ id }) => (
              <Select
                id={id}
                name="billingTreatment"
                defaultValue="additional_charge"
                options={toOptions(BILLING_TREATMENT_LABELS)}
              />
            )}
          </Field>

          <Field label="Proposed completion" error={e.proposedCompletionDate}>
            {({ id }) => <Input id={id} name="proposedCompletionDate" type="date" />}
          </Field>

          <Field
            label="Notes for the client"
            error={e.quoteNotes}
            className="sm:col-span-2"
            hint="Explain what is included, so they can decide without a phone call."
          >
            {({ id, describedBy }) => (
              <Textarea id={id} name="quoteNotes" rows={3} aria-describedby={describedBy} />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Sending…">
            {pending ? 'Send revised quotation' : 'Send quotation'}
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
