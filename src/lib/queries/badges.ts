import { OPEN_CHANGE_STATUSES, OPEN_SUPPORT_STATUSES } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';

/**
 * Counts for the sidebar badges. Every query is RLS-scoped, so an account
 * manager's badge reflects their own book of work rather than the agency's.
 *
 * Uses head:true counts — no rows come back over the wire, only the total.
 */
export async function getAgencyBadges(): Promise<Record<string, number>> {
  const today = new Date().toISOString().slice(0, 10);

  const [changeRequests, support, tasks, notifications, maintenance] = await Promise.all([
    supabase
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', OPEN_CHANGE_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('support_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', OPEN_SUPPORT_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'complete')
      .lt('due_date', today)
      .is('deleted_at', null),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false),
    supabase
      .from('renewal_reminders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['due', 'scheduled'])
      .lte('due_date', addDays(today, 30)),
  ]);

  return {
    changeRequests: changeRequests.count ?? 0,
    support: support.count ?? 0,
    tasks: tasks.count ?? 0,
    notifications: notifications.count ?? 0,
    maintenance: maintenance.count ?? 0,
  };
}

export async function getClientBadges(): Promise<Record<string, number>> {

  const [requests, support, notifications] = await Promise.all([
    supabase
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', OPEN_CHANGE_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('support_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', OPEN_SUPPORT_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false),
  ]);

  return {
    requests: requests.count ?? 0,
    support: support.count ?? 0,
    notifications: notifications.count ?? 0,
  };
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
