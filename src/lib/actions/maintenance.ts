'use server';

import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { getCurrentClientId, requireAgency, requireUser } from '@/lib/auth';
import { PLAN_REQUEST_TYPE_LABELS } from '@/lib/constants';
import { clientNotificationTargets, notify } from '@/lib/notifications';
import { setInternalNote } from '@/lib/internal-notes';
import { isAgency, isAgencyAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { formObject } from '@/lib/validation/common';
import {
  planRequestSchema,
  planSchema,
  reminderSchema,
  subscriptionSchema,
  usageSchema,
} from '@/lib/validation/maintenance';
import { errorState, successState, zodErrors, type ActionState } from './types';

/** Services are entered one per line and stored as a text array. */
function toServices(value: string | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function savePlanAction(
  planId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();
  if (!isAgencyAdmin(session.profile.role)) {
    return errorState('Only an administrator can change maintenance plans.');
  }

  const parsed = planSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const values = {
    name: input.name,
    description: input.description ?? null,
    monthly_price: input.monthlyPrice ?? null,
    annual_price: input.annualPrice ?? null,
    included_services: toServices(input.includedServices),
    included_change_minutes: input.includedChangeMinutes,
    included_support_minutes: input.includedSupportMinutes,
    response_time_hours: input.responseTimeHours ?? null,
    priority_level: input.priorityLevel,
    billing_frequency: input.billingFrequency,
    renewal_period_months: input.renewalPeriodMonths,
    is_active: input.isActive,
    is_public: input.isPublic,
  };

  if (planId) {
    const { error } = await supabase.from('maintenance_plans').update(values).eq('id', planId);
    if (error) return errorState(`Could not save the plan: ${error.message}`);

    await recordAudit({
      action: 'maintenance_plan.updated',
      entityType: 'maintenance_plan',
      entityId: planId,
      newValue: { name: input.name, is_active: input.isActive },
    });
  } else {
    // Slugs must be unique; suffix until one is free.
    const base = slugify(input.name) || 'plan';
    let slug = base;
    for (let attempt = 1; attempt < 20; attempt += 1) {
      const { data: clash } = await supabase
        .from('maintenance_plans')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${base}-${attempt + 1}`;
    }

    const { count } = await supabase
      .from('maintenance_plans')
      .select('id', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('maintenance_plans')
      .insert({ ...values, slug, position: (count ?? 0) + 1, created_by: session.userId })
      .select('id')
      .single();

    if (error || !data) return errorState(`Could not create the plan: ${error?.message ?? 'unknown error'}`);

    await recordAudit({
      action: 'maintenance_plan.created',
      entityType: 'maintenance_plan',
      entityId: data.id,
      newValue: { name: input.name },
    });
  }

  revalidatePath('/maintenance');
  return successState('Plan saved.');
}

export async function saveSubscriptionAction(
  subscriptionId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = subscriptionSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const values = {
    client_id: input.clientId,
    project_id: input.projectId ?? null,
    plan_id: input.planId,
    status: input.status,
    website_url: input.websiteUrl ?? null,
    start_date: input.startDate,
    renewal_date: input.renewalDate,
    billing_cycle: input.billingCycle,
    price: input.price ?? 0,
    included_change_minutes: input.includedChangeMinutes,
    included_support_minutes: input.includedSupportMinutes,
    auto_renew: input.autoRenew,
  };

  if (subscriptionId) {
    const { data: before } = await supabase
      .from('maintenance_subscriptions')
      .select('status, plan_id')
      .eq('id', subscriptionId)
      .maybeSingle();

    const { error } = await supabase
      .from('maintenance_subscriptions')
      .update(values)
      .eq('id', subscriptionId);

    if (error) return errorState(`Could not save the subscription: ${error.message}`);

    await setInternalNote({
      entityType: 'maintenance_subscription',
      entityId: subscriptionId,
      projectId: input.projectId ?? null,
      clientId: input.clientId,
      body: input.internalNotes,
      userId: session.userId,
    });

    // Every subscription change is recorded permanently, so the history of what
    // a client was on and when is never lost to an edit.
    if (before && (before.plan_id !== input.planId || before.status !== input.status)) {
      await supabase.from('maintenance_events').insert({
        subscription_id: subscriptionId,
        event_type:
          before.plan_id !== input.planId
            ? 'upgraded'
            : input.status === 'cancelled'
              ? 'cancelled'
              : input.status === 'suspended'
                ? 'suspended'
                : input.status === 'active'
                  ? 'reactivated'
                  : 'renewed',
        from_plan_id: before.plan_id,
        to_plan_id: input.planId,
        notes: `Changed by ${session.profile.full_name || 'an agency user'}.`,
        actor_id: session.userId,
      });
    }

    await recordAudit({
      action: AuditAction.SubscriptionUpdated,
      entityType: 'maintenance_subscription',
      entityId: subscriptionId,
      previousValue: { status: before?.status, plan_id: before?.plan_id },
      newValue: { status: input.status, plan_id: input.planId },
    });
  } else {
    const { data, error } = await supabase
      .from('maintenance_subscriptions')
      .insert({ ...values, created_by: session.userId })
      .select('id')
      .single();

    if (error || !data) {
      return errorState(`Could not create the subscription: ${error?.message ?? 'unknown error'}`);
    }

    await setInternalNote({
      entityType: 'maintenance_subscription',
      entityId: data.id,
      projectId: input.projectId ?? null,
      clientId: input.clientId,
      body: input.internalNotes,
      userId: session.userId,
    });

    await Promise.all([
      supabase.from('maintenance_events').insert({
        subscription_id: data.id,
        event_type: 'created',
        to_plan_id: input.planId,
        effective_date: input.startDate,
        actor_id: session.userId,
      }),
      recordAudit({
        action: AuditAction.SubscriptionCreated,
        entityType: 'maintenance_subscription',
        entityId: data.id,
        newValue: { client_id: input.clientId, plan_id: input.planId, status: input.status },
      }),
      recordActivity({
        clientId: input.clientId,
        projectId: input.projectId ?? null,
        action: AuditAction.SubscriptionCreated,
        summary: 'A maintenance subscription was activated',
        entityType: 'maintenance_subscription',
        entityId: data.id,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
    ]);
  }

  revalidatePath('/', 'layout');
  return successState('Subscription saved.');
}

/** Manual usage adjustment, always attributed. */
export async function recordUsageAction(
  subscriptionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = usageSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from('maintenance_subscriptions')
    .select('client_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return errorState('That subscription could not be found.');

  const { data: period } = await supabase.rpc('subscription_period', {
    p_subscription_id: subscriptionId,
    p_on: input.occurredOn,
  });
  const current = Array.isArray(period) ? period[0] : null;

  const { error } = await supabase.from('maintenance_usage').insert({
    subscription_id: subscriptionId,
    client_id: subscription.client_id,
    period_start: current?.period_start ?? input.occurredOn,
    period_end: current?.period_end ?? input.occurredOn,
    usage_type: input.usageType,
    minutes: input.minutes,
    description: input.description,
    occurred_on: input.occurredOn,
    is_manual_adjustment: true,
    recorded_by: session.userId,
  });

  if (error) return errorState(`Could not record the usage: ${error.message}`);

  await recordAudit({
    action: AuditAction.UsageRecorded,
    entityType: 'maintenance_subscription',
    entityId: subscriptionId,
    newValue: {
      minutes: input.minutes,
      usage_type: input.usageType,
      description: input.description,
      manual: true,
    },
  });

  revalidatePath('/', 'layout');
  return successState(
    input.minutes < 0 ? 'Correction recorded.' : 'Usage recorded against the allowance.',
  );
}

export async function createReminderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = reminderSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('agency_settings')
    .select('default_reminder_offsets')
    .maybeSingle();

  const { error } = await supabase.from('renewal_reminders').insert({
    client_id: input.clientId,
    subscription_id: input.subscriptionId ?? null,
    project_id: input.projectId ?? null,
    reminder_type: input.reminderType,
    title: input.title,
    due_date: input.dueDate,
    offsets: settings?.default_reminder_offsets ?? [60, 30, 14, 7, 0],
    assigned_to: input.assignedTo ?? null,
    notes: input.notes ?? null,
    created_by: session.userId,
  });

  if (error) return errorState(`Could not create the reminder: ${error.message}`);

  revalidatePath('/maintenance');
  return successState('Reminder scheduled.');
}

export async function setReminderStatusAction(
  reminderId: string,
  status: 'scheduled' | 'due' | 'acknowledged' | 'completed' | 'dismissed',
): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  await supabase
    .from('renewal_reminders')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', reminderId);

  revalidatePath('/maintenance');
  revalidatePath('/dashboard');
}

/**
 * Client asks to change their plan. Nothing about the subscription moves —
 * the agency reviews and applies it, which is the rule the spec sets out.
 */
export async function requestPlanChangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const parsed = planRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const clientId = await getCurrentClientId();
  if (!clientId) return errorState('Could not determine which client you belong to.');

  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from('maintenance_plan_requests')
    .insert({
      client_id: clientId,
      subscription_id: input.subscriptionId ?? null,
      requested_type: input.requestedType,
      requested_plan_id: input.requestedPlanId ?? null,
      message: input.message ?? null,
      status: 'pending',
      requested_by: session.userId,
    })
    .select('id')
    .single();

  if (error || !request) {
    return errorState(`Could not send the request: ${error?.message ?? 'unknown error'}`);
  }

  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .in('role', ['agency_admin', 'project_manager', 'account_manager'])
    .eq('is_active', true)
    .is('deleted_at', null);

  await Promise.all([
    recordAudit({
      action: AuditAction.PlanRequestSubmitted,
      entityType: 'maintenance_plan_request',
      entityId: request.id,
      newValue: { requested_type: input.requestedType },
    }),
    notify({
      userIds: (admins ?? []).map((a) => a.id),
      type: 'plan_request_submitted',
      title: `Plan ${PLAN_REQUEST_TYPE_LABELS[input.requestedType].toLowerCase()} requested`,
      body: input.message ?? undefined,
      clientId,
      entityType: 'maintenance_plan_request',
      entityId: request.id,
      url: '/maintenance?tab=requests',
    }),
  ]);

  revalidatePath('/', 'layout');
  return successState(
    'Thank you — your account manager will be in touch. Nothing has changed on your plan yet.',
  );
}

export async function reviewPlanRequestAction(
  requestId: string,
  decision: 'approved' | 'declined',
  responseNotes?: string,
): Promise<void> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    throw new Error('Only agency users can review plan requests.');
  }

  if (decision === 'declined' && !responseNotes?.trim()) {
    throw new Error('Explain why the request is being declined.');
  }

  const supabase = await createClient();

  const { data: request } = await supabase
    .from('maintenance_plan_requests')
    .select('client_id, requested_type')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) throw new Error('Request not found.');

  const { error } = await supabase
    .from('maintenance_plan_requests')
    .update({
      status: decision,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
      response_notes: responseNotes?.trim() || null,
    })
    .eq('id', requestId);

  if (error) throw new Error(error.message);

  await Promise.all([
    recordAudit({
      action: AuditAction.PlanRequestReviewed,
      entityType: 'maintenance_plan_request',
      entityId: requestId,
      newValue: { decision, notes: responseNotes ?? null },
    }),
    notify({
      userIds: await clientNotificationTargets(request.client_id),
      type: 'approval_received',
      title:
        decision === 'approved'
          ? 'Your plan request has been approved'
          : 'Your plan request was not approved',
      body: responseNotes?.trim() || undefined,
      clientId: request.client_id,
      entityType: 'maintenance_plan_request',
      entityId: requestId,
      url: '/portal/maintenance',
    }),
  ]);

  // Approving records the intent; the subscription itself is edited explicitly,
  // so a plan change is never applied by accident.
  revalidatePath('/', 'layout');
}

/** A client withdrawing their own pending request. */
export async function withdrawPlanRequestAction(requestId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  await supabase
    .from('maintenance_plan_requests')
    .update({ status: 'withdrawn' })
    .eq('id', requestId);

  revalidatePath('/', 'layout');
}
