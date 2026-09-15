'use client';

import { useActionState, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { acceptHandoverAction } from '@/lib/actions/handover';
import { idleState } from '@/lib/actions/types';

const STATEMENT =
  'I confirm that I have reviewed the website, that the changes we requested have been ' +
  'completed, that the website is approved for launch, that I have received the handover ' +
  'materials, and that I understand the ongoing maintenance arrangement.';

/**
 * Formal sign-off. Every box must be ticked — checked here, in the schema, and
 * by a CHECK constraint on the table. The record cannot be revised afterwards,
 * so the wording states plainly what is being agreed to.
 */
export function AcceptanceForm({
  projectId,
  handoverId,
  canAccept,
  defaultName,
}: {
  projectId: string;
  handoverId: string;
  canAccept: boolean;
  defaultName: string;
}) {
  const action = acceptHandoverAction.bind(null, projectId, handoverId);
  const [state, formAction] = useActionState(action, idleState);
  const [trainingNotApplicable, setTrainingNotApplicable] = useState(false);
  const e = state.errors ?? {};

  if (!canAccept) {
    return (
      <Card>
        <CardHeader title="Sign off the handover" />
        <CardBody>
          <Alert variant="info" title="Only an account administrator can sign this off">
            Ask whoever administers your account to complete the acceptance, or get in touch and we
            will sort it out.
          </Alert>
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Sign off the handover"
          description="Please confirm each point. This is a permanent record and cannot be changed afterwards."
        />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          <div className="space-y-3">
            <Checkbox
              name="websiteReviewed"
              label="I have reviewed the website"
            />
            {e.websiteReviewed ? <FieldError message={e.websiteReviewed} /> : null}

            <Checkbox
              name="requestedChangesCompleted"
              label="The changes we asked for have been completed"
            />
            {e.requestedChangesCompleted ? (
              <FieldError message={e.requestedChangesCompleted} />
            ) : null}

            <Checkbox
              name="approvedForLaunch"
              label="The website is approved for launch"
            />
            {e.approvedForLaunch ? <FieldError message={e.approvedForLaunch} /> : null}

            <Checkbox
              name="handoverMaterialsReceived"
              label="I have received the handover materials"
              description="Documentation, guides and anything else listed above."
            />
            {e.handoverMaterialsReceived ? (
              <FieldError message={e.handoverMaterialsReceived} />
            ) : null}

            <Checkbox
              name="trainingReceived"
              label="I have received training"
              description="Tick the box below instead if training was not part of this project."
              disabled={trainingNotApplicable}
            />
            <Checkbox
              name="trainingNotApplicable"
              label="Training does not apply to this project"
              checked={trainingNotApplicable}
              onChange={(ev) => setTrainingNotApplicable(ev.target.checked)}
            />
            {e.trainingReceived ? <FieldError message={e.trainingReceived} /> : null}

            <Checkbox
              name="maintenanceUnderstood"
              label="I understand the ongoing maintenance arrangement"
            />
            {e.maintenanceUnderstood ? <FieldError message={e.maintenanceUnderstood} /> : null}
          </div>

          <div className="rounded-lg bg-[var(--surface-sunken)] px-4 py-3">
            <p className="text-[13px] text-[var(--text-secondary)]">{STATEMENT}</p>
          </div>

          <Field
            label="Type your full name to sign"
            error={e.signatureName}
            required
            hint="We record your name, the date and time as your signature."
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="signatureName"
                required
                defaultValue={defaultName}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton size="lg" pendingLabel="Recording…">
            Accept the handover
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="pl-6 text-[12px] font-medium text-[var(--danger-text)]">
      {message}
    </p>
  );
}
