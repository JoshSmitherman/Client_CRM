
import { Alert } from '@/components/ui/alert';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { createSupportRequestAction } from '@/lib/actions/support';
import { SUPPORT_CATEGORY_LABELS, URGENCY_LABELS, toOptions } from '@/lib/constants';
import { useFormAction } from '@/lib/data/use-form-action';

export function SupportForm({
  projects,
  planName,
  responseTimeHours,
}: {
  projects: { id: string; name: string }[];
  planName: string | null;
  responseTimeHours: number | null;
}) {
  const [state, action] = useFormAction(createSupportRequestAction);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <Card>
        <CardHeader
          title="What has gone wrong?"
          description="Use this for faults and urgent problems. For planned changes, submit a change request instead."
        />
        <CardBody className="space-y-4">
          {planName ? (
            <Alert variant="success" title={`Covered by your ${planName} plan`}>
              {responseTimeHours
                ? `We aim to respond within ${responseTimeHours} hours.`
                : 'We will confirm whether this is covered when we triage it.'}
            </Alert>
          ) : (
            <Alert variant="info" title="No maintenance plan">
              You do not currently have a maintenance plan, so this may be chargeable. We will
              always tell you before doing any paid work.
            </Alert>
          )}

          <Field label="Summarise the problem" error={e.subject} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="subject"
                required
                placeholder="e.g. Contact form emails are not arriving"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What kind of problem?" error={e.category} required>
              {({ id }) => (
                <Select
                  id={id}
                  name="category"
                  required
                  placeholder="Choose"
                  options={toOptions(SUPPORT_CATEGORY_LABELS)}
                />
              )}
            </Field>

            <Field
              label="How urgent?"
              error={e.urgency}
              hint="Critical means the site is down or unusable."
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  name="urgency"
                  defaultValue="normal"
                  aria-describedby={describedBy}
                  options={toOptions(URGENCY_LABELS)}
                />
              )}
            </Field>
          </div>

          {projects.length > 0 ? (
            <Field label="Which website?" error={e.projectId}>
              {({ id }) => (
                <Select
                  id={id}
                  name="projectId"
                  placeholder="Not sure / not listed"
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                />
              )}
            </Field>
          ) : null}

          <Field
            label="Tell us what is happening"
            error={e.description}
            required
            hint="When did it start? What were you doing? Any error message you saw?"
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                name="description"
                rows={6}
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Which page is affected?" error={e.affectedUrl}>
            {({ id }) => <Input id={id} name="affectedUrl" placeholder="https://yoursite.co.uk/…" />}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton size="lg" pendingLabel="Sending…">
            Raise support request
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
