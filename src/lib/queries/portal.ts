import 'server-only';

import { getCurrentClientId } from '@/lib/auth';
import { OPEN_CHANGE_STATUSES, OPEN_SUPPORT_STATUSES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

/**
 * Everything the portal home page shows.
 *
 * Every query here is RLS-scoped to the signed-in client's organisation, so
 * there is no tenant filter to forget: a missing `.eq('client_id', …)` returns
 * nothing rather than someone else's data.
 */
export async function getPortalHome() {
  const clientId = await getCurrentClientId();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    projects,
    outstandingActions,
    changeRequests,
    supportRequests,
    subscription,
    recentFiles,
    recentComments,
    activity,
    onboarding,
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(
        'id, name, reference, project_type, completion_percentage, target_launch_date, updated_at, lifecycle_stages ( key, label, colour )',
      )
      .is('deleted_at', null)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),

    // Tasks that are explicitly the client's responsibility — the "what do I
    // need to do" list, which is the portal's single most useful feature.
    supabase
      .from('tasks')
      .select('id, title, due_date, status, priority, project_id, projects ( id, name )')
      .eq('responsibility', 'client')
      .neq('status', 'complete')
      .is('deleted_at', null)
      .order('due_date', { nullsFirst: false })
      .limit(8),

    supabase
      .from('change_requests')
      .select('id, reference, title, status, priority, submitted_at')
      .in('status', OPEN_CHANGE_STATUSES)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(5),

    supabase
      .from('support_requests')
      .select('id, reference, subject, status, urgency, submitted_at, covered_by_plan')
      .in('status', OPEN_SUPPORT_STATUSES)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(5),

    supabase
      .from('maintenance_subscriptions')
      .select(
        '*, maintenance_plans!inner ( id, name, included_services, response_time_hours )',
      )
      .in('status', ['active', 'trial', 'renewal_due'])
      .is('deleted_at', null)
      .order('renewal_date')
      .limit(1)
      .maybeSingle(),

    supabase
      .from('files')
      .select('id, file_name, category, approval_status, created_at, size_bytes, mime_type')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('comments')
      .select('id, body, created_at, project_id, users:users!comments_author_id_fkey ( full_name )')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('activity_logs')
      .select('id, summary, created_at, actor_name')
      .eq('visibility', 'client')
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('onboarding_sections')
      .select('id, project_id, status')
      .in('status', ['not_started', 'in_progress', 'needs_changes']),
  ]);

  const actions = outstandingActions.data ?? [];

  return {
    clientId,
    projects: projects.data ?? [],
    outstandingActions: actions,
    overdueActions: actions.filter((t) => t.due_date && t.due_date < today).length,
    changeRequests: changeRequests.data ?? [],
    supportRequests: supportRequests.data ?? [],
    subscription: subscription.data,
    recentFiles: recentFiles.data ?? [],
    recentComments: recentComments.data ?? [],
    activity: activity.data ?? [],
    onboardingOutstanding: (onboarding.data ?? []).length,
    // The project whose onboarding still needs attention, for the CTA.
    onboardingProjectId: (onboarding.data ?? [])[0]?.project_id ?? null,
  };
}

/** Upcoming milestones and deadlines across the client's projects. */
export async function getPortalDeadlines(limit = 6) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('project_milestones')
    .select('id, title, target_date, project_id, projects ( id, name )')
    .is('completed_at', null)
    .gte('target_date', today)
    .order('target_date')
    .limit(limit);

  return data ?? [];
}
