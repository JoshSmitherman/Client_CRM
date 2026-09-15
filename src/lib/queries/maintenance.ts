import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { addDays } from './badges';

export interface AllowanceSummary {
  periodStart: string | null;
  periodEnd: string | null;
  changeIncluded: number;
  changeUsed: number;
  changeRemaining: number;
  supportIncluded: number;
  supportUsed: number;
  supportRemaining: number;
}

export async function getPlans(includeInactive = true) {
  const supabase = await createClient();

  let query = supabase.from('maintenance_plans').select('*').order('position');
  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load maintenance plans: ${error.message}`);
  return data ?? [];
}

export async function getSubscriptions(clientId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('maintenance_subscriptions')
    .select(
      `*,
       clients!inner ( id, company_name ),
       projects ( id, name ),
       maintenance_plans!inner ( id, name, slug, response_time_hours )`,
    )
    .is('deleted_at', null)
    .order('renewal_date');

  if (clientId) query = query.eq('client_id', clientId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load subscriptions: ${error.message}`);
  return data ?? [];
}

export async function getSubscription(subscriptionId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('maintenance_subscriptions')
    .select(
      `*,
       clients!inner ( id, company_name ),
       projects ( id, name ),
       maintenance_plans!inner ( id, name, slug, included_services, response_time_hours )`,
    )
    .eq('id', subscriptionId)
    .is('deleted_at', null)
    .maybeSingle();

  return data;
}

/**
 * Included, used and remaining minutes for the billing period containing
 * `on`. The period boundaries come from the database so the app and the
 * allowance meter can never disagree about when a month starts.
 */
export async function getAllowance(
  subscriptionId: string,
  included: { change: number; support: number },
  on?: string,
): Promise<AllowanceSummary> {
  const supabase = await createClient();

  const { data } = await supabase.rpc('subscription_usage', {
    p_subscription_id: subscriptionId,
    ...(on ? { p_on: on } : {}),
  });

  const row = Array.isArray(data) ? data[0] : null;
  const changeUsed = row?.change_minutes ?? 0;
  const supportUsed = row?.support_minutes ?? 0;

  return {
    periodStart: row?.period_start ?? null,
    periodEnd: row?.period_end ?? null,
    changeIncluded: included.change,
    changeUsed,
    changeRemaining: Math.max(0, included.change - changeUsed),
    supportIncluded: included.support,
    supportUsed,
    supportRemaining: Math.max(0, included.support - supportUsed),
  };
}

export async function getUsageHistory(subscriptionId: string, limit = 50) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('maintenance_usage')
    .select(
      `*, recorder:users!maintenance_usage_recorded_by_fkey ( full_name ),
       change_requests ( id, reference, title ),
       support_requests ( id, reference, subject )`,
    )
    .eq('subscription_id', subscriptionId)
    .order('occurred_on', { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getSubscriptionEvents(subscriptionId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('maintenance_events')
    .select(
      `*, actor:users!maintenance_events_actor_id_fkey ( full_name ),
       from_plan:maintenance_plans!maintenance_events_from_plan_id_fkey ( name ),
       to_plan:maintenance_plans!maintenance_events_to_plan_id_fkey ( name )`,
    )
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getReminders(withinDays = 90) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('renewal_reminders')
    .select(
      `*, clients!inner ( id, company_name ),
       assignee:users!renewal_reminders_assigned_to_fkey ( full_name )`,
    )
    .in('status', ['scheduled', 'due', 'acknowledged'])
    .lte('due_date', addDays(today, withinDays))
    .order('due_date');

  return data ?? [];
}

export async function getPlanRequests(clientId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('maintenance_plan_requests')
    .select(
      `*, clients!inner ( id, company_name ),
       requested_plan:maintenance_plans!maintenance_plan_requests_requested_plan_id_fkey ( id, name ),
       requester:users!maintenance_plan_requests_requested_by_fkey ( full_name ),
       reviewer:users!maintenance_plan_requests_reviewed_by_fkey ( full_name )`,
    )
    .order('created_at', { ascending: false });

  if (clientId) query = query.eq('client_id', clientId);

  const { data } = await query;
  return data ?? [];
}

/**
 * Moves subscriptions into renewal_due, expires lapsed ones and surfaces
 * reminders that have reached their notification window. Idempotent.
 */
export async function sweepMaintenanceState() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('sweep_maintenance_state');
  if (error) {
    console.error('[maintenance] sweep failed', error.message);
    return null;
  }
  return data;
}
