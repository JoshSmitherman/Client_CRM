'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { recordAudit } from '@/lib/audit';
import { requireAgencyAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { email, formObject, optionalText, requiredText } from '@/lib/validation/common';
import { errorState, successState, zodErrors, type ActionState } from './types';

const settingsSchema = z.object({
  agencyName: requiredText('Agency name', 200),
  tagline: optionalText(200),
  supportEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email address'),
  supportPhone: optionalText(40),
  currency: z
    .string()
    .trim()
    .length(3, 'Use a three-letter currency code, e.g. GBP')
    .transform((v) => v.toUpperCase()),
  allowClientPlanSelection: z
    .union([z.literal('on'), z.literal(''), z.undefined()])
    .transform((v) => v === 'on'),
  allowClientColleagueInvites: z
    .union([z.literal('on'), z.literal(''), z.undefined()])
    .transform((v) => v === 'on'),
  legalAdviceDisclaimer: requiredText('Legal disclaimer', 2000),
  credentialSharingGuidance: requiredText('Credential guidance', 2000),
  reminderOffsets: z
    .string()
    .trim()
    .default('60,30,14,7,0')
    .transform((v) =>
      v
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isInteger(n) && n >= 0),
    )
    .refine((v) => v.length > 0, 'Enter at least one number of days'),
});

/**
 * Agency-wide configuration. The disclaimer and credential guidance live here
 * rather than in code so the wording can be changed without a deploy — both
 * are shown to clients at the points where they matter.
 */
export async function saveAgencySettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAgencyAdmin();

  const parsed = settingsSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from('agency_settings').upsert(
    {
      id: true,
      agency_name: input.agencyName,
      tagline: input.tagline ?? '',
      support_email: input.supportEmail ?? null,
      support_phone: input.supportPhone ?? null,
      currency: input.currency,
      allow_client_plan_selection: input.allowClientPlanSelection,
      allow_client_colleague_invites: input.allowClientColleagueInvites,
      legal_advice_disclaimer: input.legalAdviceDisclaimer,
      credential_sharing_guidance: input.credentialSharingGuidance,
      default_reminder_offsets: input.reminderOffsets,
    },
    { onConflict: 'id' },
  );

  if (error) return errorState(`Could not save the settings: ${error.message}`);

  await recordAudit({
    action: 'agency_settings.updated',
    entityType: 'agency_settings',
    entityId: null,
    newValue: { agency_name: input.agencyName, currency: input.currency },
  });

  revalidatePath('/', 'layout');
  return successState('Settings saved.');
}

const stageSchema = z.object({
  label: requiredText('Stage name', 100),
  description: optionalText(500),
  colour: z
    .string()
    .trim()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Use a HEX colour such as #4f46e5'),
});

export async function updateStageAction(
  stageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAgencyAdmin();

  const parsed = stageSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('lifecycle_stages')
    .update({
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      colour: parsed.data.colour,
    })
    .eq('id', stageId);

  if (error) return errorState(`Could not save the stage: ${error.message}`);

  revalidatePath('/', 'layout');
  return successState('Stage updated.');
}

/**
 * Deactivating hides a stage from the pickers without touching the projects
 * already sitting in it — which is why stages are data rather than an enum.
 */
export async function setStageActiveAction(stageId: string, isActive: boolean): Promise<void> {
  await requireAgencyAdmin();
  const supabase = await createClient();

  await supabase.from('lifecycle_stages').update({ is_active: isActive }).eq('id', stageId);

  revalidatePath('/', 'layout');
}
