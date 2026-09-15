'use client';

import { useActionState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { saveOnboardingSectionAction } from '@/lib/actions/onboarding';
import { idleState } from '@/lib/actions/types';
import { ONBOARDING_STATUS_LABELS } from '@/lib/constants';
import type { OnboardingSectionDef } from '@/lib/onboarding-template';
import type { Enums } from '@/lib/supabase/database.types';
import { FieldRenderer } from './field-renderer';

export function SectionForm({
  sectionId,
  definition,
  responses,
  status,
  agencyFeedback,
  readOnly = false,
}: {
  sectionId: string;
  definition: OnboardingSectionDef;
  responses: Record<string, unknown>;
  status: Enums<'onboarding_status'>;
  agencyFeedback: string | null;
  readOnly?: boolean;
}) {
  const action = saveOnboardingSectionAction.bind(null, sectionId);
  const [state, formAction] = useActionState(action, idleState);
  const errors = state.errors ?? {};

  const locked = readOnly || status === 'submitted' || status === 'not_required';

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader title={definition.title} description={definition.description} />

        <CardBody className="space-y-4">
          <FormMessage state={state} />

          {definition.notice ? (
            <Alert variant={definition.notice.variant} title={definition.notice.title}>
              {definition.notice.body}
            </Alert>
          ) : null}

          {status === 'needs_changes' && agencyFeedback ? (
            <Alert variant="warning" title="We need a few changes">
              {agencyFeedback}
            </Alert>
          ) : null}

          {status === 'submitted' ? (
            <Alert variant="info" title="Submitted for review">
              Thank you — we are reviewing this section. You will be able to edit it again if we
              need anything changed.
            </Alert>
          ) : null}

          {status === 'approved' ? (
            <Alert variant="success" title="Approved">
              This section is signed off. Get in touch if something needs to change.
            </Alert>
          ) : null}

          {status === 'not_required' ? (
            <Alert variant="info" title="Not required">
              We have marked this section as not needed for your project, so it does not count
              towards your completion figure.
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {definition.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={responses[field.key]}
                error={errors[field.key]}
                disabled={locked}
              />
            ))}
          </div>
        </CardBody>

        {!locked ? (
          <CardFooter>
            <Button type="submit" name="intent" value="save" variant="secondary">
              Save draft
            </Button>
            <SubmitButton name="intent" value="submit" pendingLabel="Submitting…">
              Submit for review
            </SubmitButton>
          </CardFooter>
        ) : (
          <CardFooter>
            <span className="text-[13px] text-[var(--text-muted)]">
              {ONBOARDING_STATUS_LABELS[status]} — this section is read-only for now.
            </span>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
