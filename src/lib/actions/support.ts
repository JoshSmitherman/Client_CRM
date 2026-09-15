'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { getCurrentClientId, requireUser } from '@/lib/auth';
import { SUPPORT_STATUS_LABELS } from '@/lib/constants';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formObject } from '@/lib/validation/common';
import { supportRequestSchema, supportTriageSchema } from '@/lib/validation/support';
import { errorState, successState, zodErrors, type ActionState } from './types';

export async function createSupportRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const parsed = supportRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const agency = isAgency(session.profile.role);

  // A client's ticket always belongs to their own organisation, whatever the
  // form says; the INSERT policy refuses anything else in any case.
  const clientId = agency ? input.clientId : await getCurrentClientId();
  if (!clientId) return errorState('Could not determine which client this ticket belongs to.');

  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from('maintenance_subscriptions')
    .select('id, maintenance_plans ( name, response_time_hours )')
    .eq('client_id', clientId)
    .in('status', ['active', 'trial', 'renewal_due'])
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  const plan = subscription?.maintenance_plans as unknown as
    | { name: string; response_time_hours: number | null }
    | null;

  // A response target is only meaningful if they have a plan with one.
  const responseDue =
    plan?.response_time_hours != null
      ? new Date(Date.now() + plan.response_time_hours * 3_600_000).toISOString()
      : null;

  const { data: request, error } = await supabase
    .from('support_requests')
    .insert({
      client_id: clientId,
      project_id: input.projectId ?? null,
      subscription_id: subscription?.id ?? null,
      subject: input.subject,
      category: input.category,
      description: input.description,
      affected_url: input.affectedUrl ?? null,
      urgency: input.urgency,
      status: 'open',
      submitted_by: session.userId,
      // Agency triage confirms cover; a client's ticket starts unassessed, and
      // the column guard stops them setting it.
      ...(agency ? {} : {}),
      ...(agency && subscription ? { covered_by_plan: true } : {}),
      response_due_at: agency ? responseDue : null,
    })
    .select('id, reference, subject')
    .single();

  if (error || !request) {
    return errorState(`Could not raise the ticket: ${error?.message ?? 'unknown error'}`);
  }

  await Promise.all([
    recordAudit({
      action: AuditAction.SupportRequestCreated,
      entityType: 'support_request',
      entityId: request.id,
      newValue: { reference: request.reference, urgency: input.urgency },
    }),
    recordActivity({
      projectId: input.projectId ?? null,
      clientId,
      action: AuditAction.SupportRequestCreated,
      summary: `Support ticket ${request.reference} "${request.subject}" was raised`,
      entityType: 'support_request',
      entityId: request.id,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
    notify({
      userIds: input.projectId
        ? await projectNotificationTargets(input.projectId)
        : await agencyAdminIds(),
      type: 'support_request_opened',
      title: `${input.urgency === 'critical' ? 'CRITICAL: ' : ''}${request.subject}`,
      body: request.reference,
      clientId,
      projectId: input.projectId ?? null,
      entityType: 'support_request',
      entityId: request.id,
      url: `/support/${request.id}`,
    }),
  ]);

  revalidatePath('/', 'layout');
  redirect(agency ? `/support/${request.id}` : `/portal/support/${request.id}`);
}

export async function triageSupportRequestAction(
  requestId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can triage support tickets.');
  }

  const parsed = supportTriageSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('support_requests')
    .select(
      'reference, subject, status, client_id, project_id, subscription_id, first_response_at, time_spent_minutes',
    )
    .eq('id', requestId)
    .maybeSingle();

  if (!before) return errorState('That ticket could not be found.');

  const now = new Date().toISOString();
  const addedMinutes = input.timeSpentMinutes - (before.time_spent_minutes ?? 0);

  const { error } = await supabase
    .from('support_requests')
    .update({
      status: input.status,
      urgency: input.urgency,
      assigned_to: input.assignedTo ?? null,
      covered_by_plan:
        input.coveredByPlan === 'yes' ? true : input.coveredByPlan === 'no' ? false : null,
      coverage_note: input.coverageNote ?? null,
      resolution_summary: input.resolutionSummary ?? null,
      internal_notes: input.internalNotes ?? null,
      time_spent_minutes: input.timeSpentMinutes,
      // Stamped once, the first time the agency touches the ticket.
      first_response_at: before.first_response_at ?? now,
      resolved_at:
        input.status === 'resolved' || input.status === 'closed' ? now : null,
    })
    .eq('id', requestId);

  if (error) return errorState(`Could not update the ticket: ${error.message}`);

  // Support time counts against the plan's support allowance, not the change
  // allowance, and only the newly added minutes are recorded.
  if (addedMinutes > 0 && before.subscription_id && input.coveredByPlan === 'yes') {
    const { data: period } = await supabase.rpc('subscription_period', {
      p_subscription_id: before.subscription_id,
    });
    const current = Array.isArray(period) ? period[0] : null;

    await supabase.from('maintenance_usage').insert({
      subscription_id: before.subscription_id,
      client_id: before.client_id,
      period_start: current?.period_start ?? now.slice(0, 10),
      period_end: current?.period_end ?? now.slice(0, 10),
      usage_type: 'support',
      minutes: addedMinutes,
      description: `${before.reference}: ${before.subject}`,
      support_request_id: requestId,
      recorded_by: session.userId,
    });
  }

  if (before.status !== input.status) {
    await Promise.all([
      recordAudit({
        action: AuditAction.SupportRequestUpdated,
        entityType: 'support_request',
        entityId: requestId,
        previousValue: { status: before.status },
        newValue: { status: input.status, urgency: input.urgency },
      }),
      recordActivity({
        projectId: before.project_id,
        clientId: before.client_id,
        action: AuditAction.SupportRequestUpdated,
        summary: `${before.reference} moved to ${SUPPORT_STATUS_LABELS[input.status]}`,
        entityType: 'support_request',
        entityId: requestId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
      notify({
        userIds: await clientNotificationTargets(before.client_id),
        type: 'support_request_updated',
        title: `${before.subject}: ${SUPPORT_STATUS_LABELS[input.status]}`,
        body: input.resolutionSummary ?? undefined,
        clientId: before.client_id,
        projectId: before.project_id,
        entityType: 'support_request',
        entityId: requestId,
        url: `/portal/support/${requestId}`,
      }),
    ]);
  }

  revalidatePath('/', 'layout');
  return successState('Ticket updated.');
}

/** A client closing their own resolved ticket. */
export async function closeSupportRequestAction(requestId: string): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: request } = await supabase
    .from('support_requests')
    .select('reference, status, client_id, project_id')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) throw new Error('Ticket not found.');

  const { error } = await supabase
    .from('support_requests')
    .update({ status: 'closed' })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  await recordActivity({
    projectId: request.project_id,
    clientId: request.client_id,
    action: AuditAction.SupportRequestUpdated,
    summary: `${request.reference} was closed`,
    entityType: 'support_request',
    entityId: requestId,
    visibility: 'client',
    actorName: session.profile.full_name,
  });

  revalidatePath('/', 'layout');
}

async function agencyAdminIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id')
    .in('role', ['agency_admin', 'project_manager', 'support_agent'])
    .eq('is_active', true)
    .is('deleted_at', null);
  return (data ?? []).map((u) => u.id);
}
