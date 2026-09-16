
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { savePlanAction } from '@/lib/actions/planning';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Tables } from '@/lib/supabase/database.types';

export function PlanEditor({
  projectId,
  plan,
  internalNote,
}: {
  projectId: string;
  plan: Tables<'project_plans'> | null;
  /** Required so a forgotten call site cannot silently blank the note. */
  internalNote: string;
}) {
  const action = savePlanAction.bind(null, projectId);
  const [state, formAction] = useFormAction(action);

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Scope and objectives"
          description="What we are delivering, and who is responsible for what."
        />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          <Field label="Scope" hint="What is included — and worth stating, what is not.">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="scope"
                rows={4}
                defaultValue={plan?.scope ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field label="Objectives" hint="What the client is trying to achieve.">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="objectives"
                rows={4}
                defaultValue={plan?.objectives ?? ''}
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Client responsibilities"
              hint="Shown to the client on their project page."
            >
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  name="clientResponsibilities"
                  rows={4}
                  defaultValue={plan?.client_responsibilities ?? ''}
                  aria-describedby={describedBy}
                />
              )}
            </Field>

            <Field label="Agency responsibilities">
              {({ id }) => (
                <Textarea
                  id={id}
                  name="agencyResponsibilities"
                  rows={4}
                  defaultValue={plan?.agency_responsibilities ?? ''}
                />
              )}
            </Field>
          </div>

          <Field label="Internal notes" hint="Agency only — the client never sees this.">
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="notes"
                rows={3}
                defaultValue={internalNote}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Save plan</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
