
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { updateProjectSettingsAction } from '@/lib/actions/projects';
import { PROJECT_HEALTH_LABELS, PROJECT_TYPE_LABELS, toOptions } from '@/lib/constants';
import { useFormAction } from '@/lib/data/use-form-action';
import type { ProjectDetail } from '@/lib/queries/projects';

export function ProjectSettingsForm({
  project,
  stages,
  internalNote,
}: {
  project: ProjectDetail;
  stages: { id: string; label: string }[];
  /** Required so a forgotten call site cannot silently blank the note. */
  internalNote: string;
}) {
  const action = updateProjectSettingsAction.bind(null, project.id);
  const [state, formAction] = useFormAction(action);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader title="Project settings" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormMessage state={state} />

          <Field label="Project name" error={e.name} required className="sm:col-span-2">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="name"
                required
                defaultValue={project.name}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Project type" error={e.projectType}>
            {({ id }) => (
              <Select
                id={id}
                name="projectType"
                defaultValue={project.project_type}
                options={toOptions(PROJECT_TYPE_LABELS)}
              />
            )}
          </Field>

          <Field label="Stage" error={e.stageId}>
            {({ id }) => (
              <Select
                id={id}
                name="stageId"
                defaultValue={project.stage_id ?? ''}
                placeholder="Not set"
                options={stages.map((s) => ({ value: s.id, label: s.label }))}
              />
            )}
          </Field>

          <Field label="Health" error={e.health} hint="Your own read on how the project is going.">
            {({ id, describedBy }) => (
              <Select
                id={id}
                name="health"
                defaultValue={project.health}
                aria-describedby={describedBy}
                options={toOptions(PROJECT_HEALTH_LABELS)}
              />
            )}
          </Field>

          <div />

          <Field label="Target start date" error={e.targetStartDate}>
            {({ id }) => (
              <Input
                id={id}
                name="targetStartDate"
                type="date"
                defaultValue={project.target_start_date ?? ''}
              />
            )}
          </Field>

          <Field label="Target launch date" error={e.targetLaunchDate}>
            {({ id }) => (
              <Input
                id={id}
                name="targetLaunchDate"
                type="date"
                defaultValue={project.target_launch_date ?? ''}
              />
            )}
          </Field>

          <Field label="Actual launch date" error={e.actualLaunchDate}>
            {({ id }) => (
              <Input
                id={id}
                name="actualLaunchDate"
                type="date"
                defaultValue={project.actual_launch_date ?? ''}
              />
            )}
          </Field>

          <div />

          <Field label="Description" error={e.description} className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} name="description" rows={3} defaultValue={project.description ?? ''} />
            )}
          </Field>

          <Field
            label="Internal notes"
            error={e.internalNotes}
            hint="Never visible to the client."
            className="sm:col-span-2"
          >
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                name="internalNotes"
                rows={4}
                defaultValue={internalNote}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
