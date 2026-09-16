import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { type ActionState } from '@/lib/actions/types';
import { PROJECT_TYPE_LABELS, toOptions } from '@/lib/constants';
import { useFormAction } from '@/lib/data/use-form-action';

export function ProjectForm({
  action,
  clients,
  stages,
  defaultClientId,
  submitLabel,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  clients: { id: string; company_name: string }[];
  stages: { id: string; label: string }[];
  defaultClientId?: string;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useFormAction(action);
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <Card>
        <CardHeader title="Project details" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" error={e.clientId} required className="sm:col-span-2">
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                name="clientId"
                required
                defaultValue={defaultClientId ?? ''}
                placeholder="Choose a client"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                options={clients.map((c) => ({ value: c.id, label: c.company_name }))}
              />
            )}
          </Field>

          <Field label="Project name" error={e.name} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="name"
                required
                placeholder="e.g. Website Redesign"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Project type" error={e.projectType} required>
            {({ id }) => (
              <Select
                id={id}
                name="projectType"
                required
                placeholder="Choose a type"
                options={toOptions(PROJECT_TYPE_LABELS)}
              />
            )}
          </Field>

          <Field label="Description" error={e.description} className="sm:col-span-2">
            {({ id }) => (
              <Textarea
                id={id}
                name="description"
                rows={3}
                placeholder="What are we delivering, in a sentence or two?"
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Schedule and stage" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Starting stage" error={e.stageId}>
            {({ id }) => (
              <Select
                id={id}
                name="stageId"
                placeholder="First stage"
                options={stages.map((s) => ({ value: s.id, label: s.label }))}
              />
            )}
          </Field>

          <div />

          <Field label="Target start date" error={e.targetStartDate}>
            {({ id }) => <Input id={id} name="targetStartDate" type="date" />}
          </Field>

          <Field label="Target launch date" error={e.targetLaunchDate}>
            {({ id }) => <Input id={id} name="targetLaunchDate" type="date" />}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Set-up" />
        <CardBody className="space-y-4">
          <Checkbox
            name="createOnboarding"
            defaultChecked
            label="Create the onboarding questionnaire"
            description="Adds the 12 standard sections so the client can start straight away."
          />

          <Field label="Internal notes" error={e.internalNotes}>
            {({ id }) => (
              <Textarea
                id={id}
                name="internalNotes"
                rows={3}
                placeholder="Context for the team. Never visible to the client."
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <Button variant="ghost" asChild>
            <Link to={cancelHref}>Cancel</Link>
          </Button>
          <SubmitButton pendingLabel="Creating…">{submitLabel}</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
