import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { decideQuoteAction } from '@/lib/actions/change-requests';
import { BILLING_TREATMENT_LABELS } from '@/lib/constants';
import { useFormAction } from '@/lib/data/use-form-action';
import { formatCurrency, formatDate } from '@/lib/format';
import type { QuoteRow } from './quote-panel';

type Decision = 'approved' | 'rejected' | 'clarification_requested';

/**
 * The client's decision on an outstanding quotation.
 *
 * Declining or asking a question requires a note — an unexplained "no" helps
 * nobody, and the agency needs something to act on.
 */
export function QuoteDecision({ requestId, quote }: { requestId: string; quote: QuoteRow }) {
  const action = decideQuoteAction.bind(null, requestId);
  const [state, formAction] = useFormAction(action);
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <Card>
      <CardHeader
        title="Your decision"
        description="Nothing is charged and no work starts until you approve."
      />

      <CardBody className="space-y-4">
        <FormMessage state={state} />

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4">
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(quote.quoted_cost)}
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
            Estimated {quote.quoted_hours} hour{quote.quoted_hours === 1 ? '' : 's'} ·{' '}
            {BILLING_TREATMENT_LABELS[quote.billing_treatment]}
          </p>
          {quote.proposed_completion_date ? (
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              We would aim to finish by {formatDate(quote.proposed_completion_date)}.
            </p>
          ) : null}
          {quote.quote_notes ? (
            <p className="mt-3 text-[13px] whitespace-pre-wrap">{quote.quote_notes}</p>
          ) : null}
        </div>

        {decision === null ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDecision('approved')}>Approve and go ahead</Button>
            <Button variant="secondary" onClick={() => setDecision('clarification_requested')}>
              Ask a question
            </Button>
            <Button variant="ghost" onClick={() => setDecision('rejected')}>
              Decline
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4" noValidate>
            <input type="hidden" name="approvalId" value={quote.id} />
            <input type="hidden" name="decision" value={decision} />

            {decision === 'approved' ? (
              <Alert variant="success" title="Approving this quotation">
                We will schedule the work and keep you updated. You can still comment below if
                anything changes.
              </Alert>
            ) : null}

            <Field
              label={
                decision === 'approved'
                  ? 'Anything to add?'
                  : decision === 'rejected'
                    ? 'Why are you declining?'
                    : 'What would you like to know?'
              }
              error={state.errors?.decisionNotes}
              required={decision !== 'approved'}
            >
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  name="decisionNotes"
                  rows={4}
                  required={decision !== 'approved'}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  placeholder={
                    decision === 'approved'
                      ? 'Optional'
                      : decision === 'rejected'
                        ? 'e.g. This is more than we can spend this quarter.'
                        : 'e.g. Does this include updating the mobile version too?'
                  }
                />
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Sending…">
                {decision === 'approved'
                  ? 'Confirm approval'
                  : decision === 'rejected'
                    ? 'Decline this quotation'
                    : 'Send question'}
              </SubmitButton>
              <Button variant="ghost" type="button" onClick={() => setDecision(null)}>
                Back
              </Button>
            </div>
          </form>
        )}
      </CardBody>

      {decision === null ? (
        <CardFooter>
          <span className="text-[12px] text-[var(--text-muted)]">
            Offered {formatDate(quote.offered_at)}
          </span>
        </CardFooter>
      ) : null}
    </Card>
  );
}
