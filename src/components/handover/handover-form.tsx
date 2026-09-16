
import { Alert } from '@/components/ui/alert';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { saveHandoverAction } from '@/lib/actions/handover';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Tables } from '@/lib/supabase/database.types';

export function HandoverForm({
  handover,
  credentialGuidance,
}: {
  handover: Tables<'handovers'>;
  credentialGuidance: string;
}) {
  const action = saveHandoverAction.bind(null, handover.id);
  const [state, formAction] = useFormAction(action);
  const e = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <Card>
        <CardHeader
          title="Website details"
          description="Where everything lives and who provides it."
        />
        <CardBody className="space-y-4">
          <FormMessage state={state} />

          <Alert variant="warning" title="No passwords here">
            {credentialGuidance}
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website address" error={e.websiteUrl}>
              {({ id }) => (
                <Input id={id} name="websiteUrl" defaultValue={handover.website_url ?? ''} />
              )}
            </Field>

            <Field label="Administration address" error={e.adminUrl}>
              {({ id }) => <Input id={id} name="adminUrl" defaultValue={handover.admin_url ?? ''} />}
            </Field>

            <Field label="CMS platform" error={e.cmsPlatform}>
              {({ id }) => (
                <Input id={id} name="cmsPlatform" defaultValue={handover.cms_platform ?? ''} />
              )}
            </Field>

            <Field label="Hosting provider" error={e.hostingProvider}>
              {({ id }) => (
                <Input
                  id={id}
                  name="hostingProvider"
                  defaultValue={handover.hosting_provider ?? ''}
                />
              )}
            </Field>

            <Field label="Domain registrar" error={e.domainRegistrar}>
              {({ id }) => (
                <Input
                  id={id}
                  name="domainRegistrar"
                  defaultValue={handover.domain_registrar ?? ''}
                />
              )}
            </Field>

            <Field label="Domain expires" error={e.domainExpiry}>
              {({ id }) => (
                <Input
                  id={id}
                  name="domainExpiry"
                  type="date"
                  defaultValue={handover.domain_expiry ?? ''}
                />
              )}
            </Field>

            <Field label="DNS provider" error={e.dnsProvider}>
              {({ id }) => (
                <Input id={id} name="dnsProvider" defaultValue={handover.dns_provider ?? ''} />
              )}
            </Field>

            <Field label="SSL provider" error={e.sslProvider}>
              {({ id }) => (
                <Input id={id} name="sslProvider" defaultValue={handover.ssl_provider ?? ''} />
              )}
            </Field>

            <Field label="SSL expires" error={e.sslExpiry}>
              {({ id }) => (
                <Input
                  id={id}
                  name="sslExpiry"
                  type="date"
                  defaultValue={handover.ssl_expiry ?? ''}
                />
              )}
            </Field>
          </div>

          {(
            [
              ['hostingNotes', 'Hosting notes', handover.hosting_notes],
              ['analyticsNotes', 'Analytics', handover.analytics_notes],
              ['searchConsoleNotes', 'Search Console', handover.search_console_notes],
              ['backupNotes', 'Backups', handover.backup_notes],
              ['securityNotes', 'Security', handover.security_notes],
              ['licenceNotes', 'Licences', handover.licence_notes],
              ['documentationNotes', 'Documentation', handover.documentation_notes],
              ['trainingNotes', 'Training', handover.training_notes],
              ['maintenanceNotes', 'Maintenance', handover.maintenance_notes],
            ] as const
          ).map(([name, label, value]) => (
            <Field key={name} label={label} error={e[name]}>
              {({ id }) => <Textarea id={id} name={name} rows={2} defaultValue={value ?? ''} />}
            </Field>
          ))}
        </CardBody>
        <CardFooter>
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
