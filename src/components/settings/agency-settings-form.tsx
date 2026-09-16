
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { saveAgencySettingsAction } from '@/lib/actions/settings';
import { useFormAction } from '@/lib/data/use-form-action';
import type { Tables } from '@/lib/supabase/database.types';

export function AgencySettingsForm({ settings }: { settings: Tables<'agency_settings'> | null }) {
  const [state, action] = useFormAction(saveAgencySettingsAction);
  const e = state.errors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />

      <Card>
        <CardHeader title="Your agency" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Agency name" error={e.agencyName} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="agencyName"
                required
                defaultValue={settings?.agency_name ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Tagline" error={e.tagline}>
            {({ id }) => <Input id={id} name="tagline" defaultValue={settings?.tagline ?? ''} />}
          </Field>

          <Field label="Support email" error={e.supportEmail}>
            {({ id }) => (
              <Input
                id={id}
                name="supportEmail"
                type="email"
                defaultValue={settings?.support_email ?? ''}
              />
            )}
          </Field>

          <Field label="Support telephone" error={e.supportPhone}>
            {({ id }) => (
              <Input id={id} name="supportPhone" type="tel" defaultValue={settings?.support_phone ?? ''} />
            )}
          </Field>

          <Field label="Currency" error={e.currency} hint="Three-letter code, e.g. GBP.">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="currency"
                maxLength={3}
                defaultValue={settings?.currency ?? 'GBP'}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field
            label="Reminder days"
            error={e.reminderOffsets}
            hint="Days before a renewal to raise a reminder, comma separated."
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="reminderOffsets"
                defaultValue={(settings?.default_reminder_offsets ?? [60, 30, 14, 7, 0]).join(',')}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Staff access"
          description="How your own team gets accounts. Client logins are always created from inside the platform."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Self-registration"
            error={e.staffSignupMode}
            hint="Applies to email addresses on an approved domain below."
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                name="staffSignupMode"
                defaultValue={settings?.staff_signup_mode ?? 'approval_required'}
                aria-describedby={describedBy}
                options={[
                  { value: 'approval_required', label: 'Allowed, but I approve each one' },
                  { value: 'domain_allowlist', label: 'Allowed, active straight away' },
                  { value: 'disabled', label: 'Off — invitation only' },
                ]}
              />
            )}
          </Field>

          <Field
            label="Approved email domains"
            error={e.staffEmailDomains}
            hint="One per line, e.g. northpointdigital.co.uk. Anyone signing up from another domain gets an account with no access at all."
            className="sm:col-span-2"
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                name="staffEmailDomains"
                rows={3}
                defaultValue={(settings?.staff_email_domains ?? []).join('\n')}
                placeholder="youragency.co.uk"
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="What clients can do" />
        <CardBody className="space-y-3">
          <Checkbox
            name="allowClientPlanSelection"
            defaultChecked={settings?.allow_client_plan_selection ?? true}
            label="Clients can request a plan change"
            description="They can ask to upgrade, downgrade or cancel. You still approve every change."
          />
          <Checkbox
            name="allowClientColleagueInvites"
            defaultChecked={settings?.allow_client_colleague_invites ?? true}
            label="Client administrators can invite colleagues"
            description="Only into their own organisation, and only as client users."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Wording shown to clients"
          description="These appear in the onboarding questionnaire and the handover, so they can be reworded without a deploy."
        />
        <CardBody className="space-y-4">
          <Field
            label="Legal advice disclaimer"
            error={e.legalAdviceDisclaimer}
            required
            hint="Shown on the Legal and Compliance section of onboarding."
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                name="legalAdviceDisclaimer"
                rows={3}
                required
                defaultValue={settings?.legal_advice_disclaimer ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field
            label="Credential sharing guidance"
            error={e.credentialSharingGuidance}
            required
            hint="Shown wherever someone might otherwise be tempted to type a password."
          >
            {({ id, describedBy, invalid }) => (
              <Textarea
                id={id}
                name="credentialSharingGuidance"
                rows={3}
                required
                defaultValue={settings?.credential_sharing_guidance ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
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
