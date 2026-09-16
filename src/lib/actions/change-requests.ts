
import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { CHANGE_STATUS_LABELS } from '@/lib/constants';
import { setInternalNote } from '@/lib/internal-notes';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { currentUser } from '@/lib/session';
import { supabase } from '@/lib/supabase/client';
import type { Enums } from '@/lib/supabase/database.types';
import { formObject } from '@/lib/validation/common';
import {
  changeRequestSchema,
  changeRequestTriageSchema,
  logEffortSchema,
  quoteDecisionSchema,
  quoteSchema,
} from '@/lib/validation/change-requests';
import { uploadFilesAction } from './files';
import { errorState, successState, zodErrors, type ActionState } from './types';

/**
 * Client (or agency on their behalf) raises a change request.
 *
 * No commercial field is accepted here at all — the schema has none, the
 * INSERT policy refuses a client row that sets one, and the column guard
 * trigger refuses a later attempt to add one.
 */
export async function createChangeRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();

  const parsed = changeRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, client_id')
    .eq('id', input.projectId)
    .maybeSingle();

  if (!project) return errorState('That project could not be found.');

  // Attach the client's active subscription so coverage can be judged at triage.
  const { data: subscription } = await supabase
    .from('maintenance_subscriptions')
    .select('id')
    .eq('client_id', project.client_id)
    .in('status', ['active', 'trial', 'renewal_due'])
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  const { data: request, error } = await supabase
    .from('change_requests')
    .insert({
      project_id: project.id,
      client_id: project.client_id,
      subscription_id: subscription?.id ?? null,
      title: input.title,
      category: input.category,
      description: input.description,
      affected_url: input.affectedUrl ?? null,
      desired_outcome: input.desiredOutcome ?? null,
      priority: input.priority,
      status: 'submitted',
      submitted_by: session.userId,
    })
    .select('id, reference, title')
    .single();

  if (error || !request) {
    return errorState(`Could not submit the request: ${error?.message ?? 'unknown error'}`);
  }

  const attachments = formData
    .getAll('files')
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (attachments.length > 0) {
    // Reuse the same upload path so validation and storage policies apply.
    const uploadData = new FormData();
    uploadData.set('projectId', project.id);
    uploadData.set('clientId', project.client_id);
    for (const file of attachments) uploadData.append('files', file);

    await uploadFilesAction({ status: 'idle' }, uploadData);

    // Link the newly uploaded files to this request.
    await supabase
      .from('files')
      .update({ change_request_id: request.id })
      .eq('project_id', project.id)
      .eq('uploaded_by', session.userId)
      .is('change_request_id', null)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString());
  }

  await Promise.all([
    recordAudit({
      action: AuditAction.ChangeRequestCreated,
      entityType: 'change_request',
      entityId: request.id,
      newValue: { reference: request.reference, title: request.title, status: 'submitted' },
    }),
    recordActivity({
      projectId: project.id,
      clientId: project.client_id,
      action: AuditAction.ChangeRequestCreated,
      summary: `Change request ${request.reference} "${request.title}" was submitted`,
      entityType: 'change_request',
      entityId: request.id,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
    notify({
      userIds: await projectNotificationTargets(project.id),
      type: 'change_request_submitted',
      title: `New change request: ${request.title}`,
      body: `${project.name} · ${request.reference}`,
      projectId: project.id,
      clientId: project.client_id,
      entityType: 'change_request',
      entityId: request.id,
      url: `/change-requests/${request.id}`,
    }),
  ]);
  return successState(undefined, isAgency(session.profile.role)
      ? `/change-requests/${request.id}`
      : `/portal/requests/${request.id}`);
}

/** Agency triage: status, assignment, billing treatment and notes. */
export async function triageChangeRequestAction(
  requestId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can triage change requests.');
  }

  const parsed = changeRequestTriageSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

  if (input.status === 'rejected' && !input.rejectedReason?.trim()) {
    return errorState('A reason is required when rejecting a request.', {
      rejectedReason: 'Explain why this request is being rejected.',
    });
  }

  const { data: before } = await supabase
    .from('change_requests')
    .select('reference, title, status, project_id, client_id, assigned_to')
    .eq('id', requestId)
    .maybeSingle();

  if (!before) return errorState('That request could not be found.');

  const { error } = await supabase
    .from('change_requests')
    .update({
      status: input.status,
      billing_treatment: input.billingTreatment ?? null,
      assigned_to: input.assignedTo ?? null,
      priority: input.priority,
      estimated_completion_date: input.estimatedCompletionDate ?? null,
      client_notes: input.clientNotes ?? null,
      rejected_reason: input.rejectedReason ?? null,
      completed_at: input.status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', requestId);

  if (error) return errorState(`Could not update the request: ${error.message}`);

  await setInternalNote({
    entityType: 'change_request',
    entityId: requestId,
    projectId: before.project_id,
    clientId: before.client_id,
    body: input.internalNotes,
    userId: session.userId,
  });

  if (before.status !== input.status) {
    await Promise.all([
      recordAudit({
        action: AuditAction.ChangeRequestStatusChanged,
        entityType: 'change_request',
        entityId: requestId,
        previousValue: { status: before.status },
        newValue: { status: input.status, billing_treatment: input.billingTreatment ?? null },
      }),
      recordActivity({
        projectId: before.project_id,
        clientId: before.client_id,
        action: AuditAction.ChangeRequestStatusChanged,
        summary: `${before.reference} moved to ${CHANGE_STATUS_LABELS[input.status]}`,
        entityType: 'change_request',
        entityId: requestId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
      notify({
        userIds: await clientNotificationTargets(before.client_id),
        type: 'change_request_updated',
        title: `${before.title}: ${CHANGE_STATUS_LABELS[input.status]}`,
        body: input.clientNotes ?? undefined,
        projectId: before.project_id,
        clientId: before.client_id,
        entityType: 'change_request',
        entityId: requestId,
        url: `/portal/requests/${requestId}`,
      }),
    ]);
  }

  // Newly assigned developer hears about it.
  if (input.assignedTo && input.assignedTo !== before.assigned_to) {
    await notify({
      userIds: [input.assignedTo],
      type: 'change_request_updated',
      title: `Assigned to you: ${before.title}`,
      body: before.reference,
      projectId: before.project_id,
      entityType: 'change_request',
      entityId: requestId,
      url: `/change-requests/${requestId}`,
    });

    await recordActivity({
      projectId: before.project_id,
      clientId: before.client_id,
      action: 'change_request.assigned',
      summary: `${before.reference} was assigned to a developer`,
      entityType: 'change_request',
      entityId: requestId,
      actorName: session.profile.full_name,
    });
  }
  return successState('Request updated.');
}

/**
 * Records a quotation and puts the request in front of the client.
 *
 * Each offer is its own change_request_approvals row, so the whole negotiation
 * history survives rather than being overwritten.
 */
export async function offerQuoteAction(
  requestId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can issue a quotation.');
  }

  const parsed = quoteSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the quotation details.', zodErrors(parsed.error));
  }

  const input = parsed.data;

  const { data: request } = await supabase
    .from('change_requests')
    .select('reference, title, project_id, client_id')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) return errorState('That request could not be found.');

  // Only one offer may be outstanding; supersede any earlier pending one.
  await supabase
    .from('change_request_approvals')
    .update({
      decision: 'rejected',
      decision_notes: 'Superseded by a revised quotation.',
      decided_by: session.userId,
      decided_at: new Date().toISOString(),
    })
    .eq('change_request_id', requestId)
    .eq('decision', 'pending');

  const { error: quoteError } = await supabase.from('change_request_approvals').insert({
    change_request_id: requestId,
    quoted_hours: input.quotedHours,
    quoted_cost: input.quotedCost,
    quote_notes: input.quoteNotes ?? null,
    proposed_completion_date: input.proposedCompletionDate ?? null,
    billing_treatment: input.billingTreatment,
    offered_by: session.userId,
    decision: 'pending',
  });

  if (quoteError) return errorState(`Could not save the quotation: ${quoteError.message}`);

  await supabase
    .from('change_requests')
    .update({
      status: 'awaiting_client_approval',
      billing_treatment: input.billingTreatment,
      estimated_hours: input.quotedHours,
      estimated_cost: input.quotedCost,
      estimated_completion_date: input.proposedCompletionDate ?? null,
    })
    .eq('id', requestId);

  await Promise.all([
    recordAudit({
      action: AuditAction.ChangeRequestQuoted,
      entityType: 'change_request',
      entityId: requestId,
      newValue: {
        quoted_hours: input.quotedHours,
        quoted_cost: input.quotedCost,
        billing_treatment: input.billingTreatment,
      },
    }),
    recordActivity({
      projectId: request.project_id,
      clientId: request.client_id,
      action: AuditAction.ChangeRequestQuoted,
      summary: `A quotation was issued for ${request.reference}`,
      entityType: 'change_request',
      entityId: requestId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
    notify({
      userIds: await clientNotificationTargets(request.client_id),
      type: 'change_request_quote_ready',
      title: `Quotation ready: ${request.title}`,
      body: 'Please review and let us know whether to proceed.',
      projectId: request.project_id,
      clientId: request.client_id,
      entityType: 'change_request',
      entityId: requestId,
      url: `/portal/requests/${requestId}`,
    }),
  ]);
  return successState('Quotation sent to the client.');
}

/** The client's decision on an outstanding quotation. */
export async function decideQuoteAction(
  requestId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();

  const parsed = quoteDecisionSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check your response.', zodErrors(parsed.error));
  }

  const input = parsed.data;

  if (input.decision !== 'approved' && !input.decisionNotes?.trim()) {
    return errorState('Tell us why, so we can help.', {
      decisionNotes:
        input.decision === 'rejected'
          ? 'Please let us know why you are declining.'
          : 'Tell us what you would like clarified.',
    });
  }

  const { error: decisionError } = await supabase
    .from('change_request_approvals')
    .update({
      decision: input.decision,
      decided_by: session.userId,
      decided_at: new Date().toISOString(),
      decision_notes: input.decisionNotes ?? null,
    })
    .eq('id', input.approvalId)
    .eq('change_request_id', requestId)
    .eq('decision', 'pending');

  if (decisionError) {
    return errorState(`Could not record your decision: ${decisionError.message}`);
  }

  const nextStatus: Enums<'change_request_status'> =
    input.decision === 'approved'
      ? 'approved'
      : input.decision === 'rejected'
        ? 'rejected'
        : 'more_information_required';

  const { data: request } = await supabase
    .from('change_requests')
    .select('reference, title, project_id, client_id')
    .eq('id', requestId)
    .maybeSingle();

  // A client cannot write this column directly, so it goes through an agency
  // path: the status update below is performed with the same session, and the
  // client_update policy permits exactly these target states.
  await supabase.from('change_requests').update({ status: nextStatus }).eq('id', requestId);

  if (request) {
    await Promise.all([
      recordAudit({
        action: AuditAction.ChangeRequestDecision,
        entityType: 'change_request',
        entityId: requestId,
        newValue: { decision: input.decision, notes: input.decisionNotes ?? null },
      }),
      supabase.from('approvals').insert({
        project_id: request.project_id,
        client_id: request.client_id,
        entity_type: 'change_request',
        entity_id: requestId,
        decision:
          input.decision === 'approved'
            ? 'approved'
            : input.decision === 'rejected'
              ? 'rejected'
              : 'changes_requested',
        reason: input.decisionNotes ?? null,
        previous_status: 'awaiting_client_approval',
        new_status: nextStatus,
        decided_by: session.userId,
      }),
      recordActivity({
        projectId: request.project_id,
        clientId: request.client_id,
        action: AuditAction.ChangeRequestDecision,
        summary:
          input.decision === 'approved'
            ? `The client approved the quotation for ${request.reference}`
            : input.decision === 'rejected'
              ? `The client declined the quotation for ${request.reference}`
              : `The client asked for clarification on ${request.reference}`,
        entityType: 'change_request',
        entityId: requestId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
      notify({
        userIds: await projectNotificationTargets(request.project_id),
        type: 'approval_received',
        title: `${request.title}: client ${input.decision.replace('_', ' ')}`,
        body: input.decisionNotes ?? undefined,
        projectId: request.project_id,
        clientId: request.client_id,
        entityType: 'change_request',
        entityId: requestId,
        url: `/change-requests/${requestId}`,
      }),
    ]);
  }
  return successState('Thank you — your decision has been recorded.');
}

/**
 * Logs effort and, where the work is covered by a plan, draws it down from the
 * client's current maintenance allowance.
 */
export async function logChangeEffortAction(
  requestId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can log effort.');
  }

  const parsed = logEffortSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

  const { data: request } = await supabase
    .from('change_requests')
    .select('reference, project_id, client_id, subscription_id, billing_treatment, logged_minutes')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) return errorState('That request could not be found.');

  await supabase
    .from('change_requests')
    .update({ logged_minutes: (request.logged_minutes ?? 0) + input.minutes })
    .eq('id', requestId);

  if (request.subscription_id && request.billing_treatment === 'included_in_plan') {
    const { data: period } = await supabase.rpc('subscription_period', {
      p_subscription_id: request.subscription_id,
    });

    const current = Array.isArray(period) ? period[0] : null;

    await supabase.from('maintenance_usage').insert({
      subscription_id: request.subscription_id,
      client_id: request.client_id,
      period_start: current?.period_start ?? new Date().toISOString().slice(0, 10),
      period_end: current?.period_end ?? new Date().toISOString().slice(0, 10),
      usage_type: 'change',
      minutes: input.minutes,
      description: `${request.reference}: ${input.description}`,
      change_request_id: requestId,
      recorded_by: session.userId,
    });
  }

  await Promise.all([
    recordAudit({
      action: AuditAction.UsageRecorded,
      entityType: 'change_request',
      entityId: requestId,
      newValue: { minutes: input.minutes, description: input.description },
    }),
    recordActivity({
      projectId: request.project_id,
      clientId: request.client_id,
      action: AuditAction.UsageRecorded,
      summary: `${input.minutes} minutes logged against ${request.reference}`,
      entityType: 'change_request',
      entityId: requestId,
      actorName: session.profile.full_name,
    }),
  ]);
  return successState('Effort logged.');
}

/** A client withdrawing their own request before work starts. */
export async function cancelChangeRequestAction(requestId: string): Promise<void> {
  const session = await currentUser();

  const { data: request } = await supabase
    .from('change_requests')
    .select('reference, status, project_id, client_id')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) throw new Error('Request not found.');

  const { error } = await supabase
    .from('change_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  await Promise.all([
    recordAudit({
      action: AuditAction.ChangeRequestStatusChanged,
      entityType: 'change_request',
      entityId: requestId,
      previousValue: { status: request.status },
      newValue: { status: 'cancelled' },
    }),
    recordActivity({
      projectId: request.project_id,
      clientId: request.client_id,
      action: AuditAction.ChangeRequestStatusChanged,
      summary: `${request.reference} was cancelled`,
      entityType: 'change_request',
      entityId: requestId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
  ]);
}
