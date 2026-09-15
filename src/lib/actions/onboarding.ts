'use server';

import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import type { Enums, Json } from '@/lib/supabase/database.types';
import { formObject } from '@/lib/validation/common';
import { missingRequiredFields, sectionSchema } from '@/lib/validation/onboarding';
import { errorState, successState, zodErrors, type ActionState } from './types';

/**
 * Saves a section as a draft or submits it for review.
 *
 * A draft accepts partially completed answers so a client can stop and come
 * back; a submission validates every required field. The intent arrives as a
 * form field rather than two near-identical actions.
 */
export async function saveOnboardingSectionAction(
  sectionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: section } = await supabase
    .from('onboarding_sections')
    .select('id, key, title, status, project_id, responses, projects ( client_id, name )')
    .eq('id', sectionId)
    .maybeSingle();

  if (!section) return errorState('That section could not be found.');

  const intent = String(formData.get('intent') ?? 'save');
  const submitting = intent === 'submit';

  const raw = formObject(formData);
  delete raw.intent;

  const parsed = sectionSchema(section.key, submitting).safeParse(raw);
  if (!parsed.success) {
    return errorState(
      submitting ? 'Some required answers are missing.' : 'Some answers could not be saved.',
      zodErrors(parsed.error),
    );
  }

  const responses = parsed.data as Record<string, unknown>;

  // A section already approved should not silently revert on an edit.
  const nextStatus: Enums<'onboarding_status'> = submitting
    ? 'submitted'
    : section.status === 'approved'
      ? 'approved'
      : 'in_progress';

  const { error } = await supabase
    .from('onboarding_sections')
    .update({
      responses: responses as Json,
      status: nextStatus,
      ...(submitting
        ? { submitted_at: new Date().toISOString(), submitted_by: session.userId }
        : {}),
    })
    .eq('id', sectionId);

  if (error) return errorState(`Could not save your answers: ${error.message}`);

  const project = section.projects as unknown as { client_id: string; name: string } | null;

  if (submitting) {
    await Promise.all([
      recordAudit({
        action: AuditAction.OnboardingSubmitted,
        entityType: 'onboarding_section',
        entityId: sectionId,
        previousValue: { status: section.status },
        newValue: { status: 'submitted' },
      }),
      recordActivity({
        projectId: section.project_id,
        clientId: project?.client_id ?? null,
        action: AuditAction.OnboardingSubmitted,
        summary: `${section.title} was submitted for review`,
        entityType: 'onboarding_section',
        entityId: sectionId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
      notify({
        userIds: await projectNotificationTargets(section.project_id),
        type: 'onboarding_submitted',
        title: `${section.title} submitted`,
        body: `${project?.name ?? 'A project'} — ready for review.`,
        projectId: section.project_id,
        entityType: 'onboarding_section',
        entityId: sectionId,
        url: `/projects/${section.project_id}/onboarding`,
      }),
    ]);
  }

  revalidatePath('/', 'layout');

  return successState(
    submitting
      ? 'Submitted. We will review it and come back to you.'
      : 'Saved. You can come back and finish this later.',
  );
}

/** Agency review decision on a submitted section. */
export async function reviewOnboardingSectionAction(
  sectionId: string,
  decision: 'approved' | 'needs_changes' | 'not_required',
  feedback?: string,
): Promise<void> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    throw new Error('Only agency users can review onboarding sections.');
  }

  if (decision === 'needs_changes' && !feedback?.trim()) {
    throw new Error('Explain what the client needs to change.');
  }

  const supabase = await createClient();

  const { data: section } = await supabase
    .from('onboarding_sections')
    .select('title, status, project_id, projects ( client_id )')
    .eq('id', sectionId)
    .maybeSingle();

  if (!section) throw new Error('Section not found.');

  const { error } = await supabase
    .from('onboarding_sections')
    .update({
      status: decision,
      agency_feedback: feedback?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.userId,
    })
    .eq('id', sectionId);

  if (error) throw new Error(error.message);

  const clientId = (section.projects as unknown as { client_id: string } | null)?.client_id ?? null;

  await Promise.all([
    recordAudit({
      action: AuditAction.OnboardingReviewed,
      entityType: 'onboarding_section',
      entityId: sectionId,
      previousValue: { status: section.status },
      newValue: { status: decision, feedback: feedback ?? null },
    }),
    supabase.from('approvals').insert({
      project_id: section.project_id,
      client_id: clientId,
      entity_type: 'onboarding_section',
      entity_id: sectionId,
      decision:
        decision === 'approved'
          ? 'approved'
          : decision === 'needs_changes'
            ? 'changes_requested'
            : 'approved',
      reason: feedback?.trim() || (decision === 'not_required' ? 'Marked not required' : null),
      previous_status: section.status,
      new_status: decision,
      decided_by: session.userId,
    }),
    recordActivity({
      projectId: section.project_id,
      clientId,
      action: AuditAction.OnboardingReviewed,
      summary:
        decision === 'approved'
          ? `${section.title} was approved`
          : decision === 'not_required'
            ? `${section.title} was marked not required`
            : `${section.title} needs changes`,
      entityType: 'onboarding_section',
      entityId: sectionId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
    clientId
      ? notify({
          userIds: await clientNotificationTargets(clientId),
          type: decision === 'needs_changes' ? 'onboarding_needs_changes' : 'approval_received',
          title:
            decision === 'approved'
              ? `${section.title} approved`
              : decision === 'not_required'
                ? `${section.title} is not required`
                : `${section.title} needs changes`,
          body: feedback?.trim() || undefined,
          projectId: section.project_id,
          clientId,
          entityType: 'onboarding_section',
          entityId: sectionId,
          url: `/portal/projects/${section.project_id}/onboarding`,
        })
      : Promise.resolve(),
  ]);

  revalidatePath('/', 'layout');
}

/** Re-opens a section the client needs to revisit. */
export async function reopenOnboardingSectionAction(sectionId: string): Promise<void> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) throw new Error('Only agency users can reopen a section.');

  const supabase = await createClient();

  await supabase
    .from('onboarding_sections')
    .update({ status: 'in_progress', reviewed_at: null, reviewed_by: null })
    .eq('id', sectionId);

  revalidatePath('/', 'layout');
}
