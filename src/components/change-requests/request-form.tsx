
import { Alert } from '@/components/ui/alert';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { createChangeRequestAction } from '@/lib/actions/change-requests';
import { CHANGE_CATEGORY_LABELS, PRIORITY_LABELS, toOptions } from '@/lib/constants';
import { useFormAction } from '@/lib/data/use-form-action';
import { ACCEPT_ATTRIBUTE } from '@/lib/files';

/**
 * What the client fills in. There is deliberately no price, hours or cover
 * field: those are the agency's to set, refused by the insert policy and by a
 * column guard trigger if they were ever submitted.
 */
export function ChangeRequestForm({
  projects,
  defaultProjectId,
  coveredByPlan,
}: {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  coveredByPlan: boolean;
}) {
  const [state, action] = useFormAction(createChangeRequestAction);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <Card>
        <CardHeader
          title="What would you like changed?"
          description="Tell us what you need and we will come back to you with next steps."
        />
        <CardBody className="space-y-4">
          {coveredByPlan ? (
            <Alert variant="info" title="You have a maintenance plan">
              Many changes are included in your plan. If this one needs extra work we will send
              you a quotation first — nothing is ever charged without your approval.
            </Alert>
          ) : (
            <Alert variant="info">
              We will review this and let you know the cost and timescale before any work starts.
            </Alert>
          )}

          <Field label="Which website?" error={e.projectId} required>
            {({ id }) => (
              <Select
                id={id}
                name="projectId"
                required
                defaultValue={defaultProjectId ?? projects[0]?.id ?? ''}
                placeholder="Choose"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            )}
          </Field>

          <Field
            label="Give it a short title"
            error={e.title}
            required
            hint="For example, “Update the opening hours on the contact page”."
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="title"
                required
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What kind of change is it?" error={e.category} required>
              {({ id }) => (
                <Select
                  id={id}
                  name="category"
                  required
                  placeholder="Choose"
                  options={toOptions(CHANGE_CATEGORY_LABELS)}
                />
              )}
            </Field>

            <Field label="How urgent is it?" error={e.priority}>
              {({ id }) => (
                <Select id={id} name="priority" defaultValue="medium" options={toOptions(PRIORITY_LABELS)} />
              )}
            </Field>
          </div>

          <Field
            label="Describe the change"
            error={e.description}
            required
            hint="The more detail the better — exact wording, which page, anything we should avoid."
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

          <Field
            label="Which page is affected?"
            error={e.affectedUrl}
            hint="Paste the web address if you have it."
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                name="affectedUrl"
                placeholder="https://yoursite.co.uk/contact"
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <Field
            label="What should it look like afterwards?"
            error={e.desiredOutcome}
            hint="Optional, but it helps us get it right first time."
          >
            {({ id, describedBy }) => (
              <Textarea id={id} name="desiredOutcome" rows={3} aria-describedby={describedBy} />
            )}
          </Field>

          <Field
            label="Screenshots or files"
            hint="Optional. Images, PDFs and documents up to 100 MB each."
          >
            {({ id, describedBy }) => (
              <input
                id={id}
                name="files"
                type="file"
                multiple
                accept={ACCEPT_ATTRIBUTE}
                aria-describedby={describedBy}
                className="w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-sunken)] file:px-3 file:py-2 file:text-[13px]"
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton size="lg" pendingLabel="Sending…">
            Submit request
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
