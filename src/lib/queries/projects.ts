import { OPEN_CHANGE_STATUSES, OPEN_SUPPORT_STATUSES } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';

export async function getProject(projectId: string) {

  const { data, error } = await supabase
    .from('projects')
    .select(
      `*,
       clients!inner ( id, company_name, trading_name, organisation_id ),
       lifecycle_stages ( id, key, label, colour, position )`,
    )
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load project: ${error.message}`);
  return data;
}

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProject>>>;

/** Counts driving the tab badges in the project workspace. */
export async function getProjectTabCounts(projectId: string) {

  const [tasks, changes, support, files, comments, pendingOnboarding] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .neq('status', 'complete')
      .is('deleted_at', null),
    supabase
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in('status', OPEN_CHANGE_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('support_requests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .in('status', OPEN_SUPPORT_STATUSES)
      .is('deleted_at', null),
    supabase
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('deleted_at', null),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('deleted_at', null),
    supabase
      .from('onboarding_sections')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'submitted'),
  ]);

  return {
    tasks: tasks.count ?? 0,
    changes: changes.count ?? 0,
    support: support.count ?? 0,
    files: files.count ?? 0,
    comments: comments.count ?? 0,
    onboarding: pendingOnboarding.count ?? 0,
  };
}

/** The per-component progress breakdown, computed in the database. */
export async function getProjectProgress(projectId: string) {

  const { data, error } = await supabase.rpc('calculate_project_progress', {
    p_project_id: projectId,
  });

  if (error) {
    console.error('[progress] failed', error.message);
    return null;
  }

  return data as Record<string, number | null> | null;
}

export async function getProjectMembers(projectId: string) {

  const { data } = await supabase
    .from('project_members')
    .select('id, project_role, can_edit, user_id, users ( id, full_name, email, role )')
    .eq('project_id', projectId);

  return data ?? [];
}

/** Everything the Overview tab renders. */
export async function getProjectOverview(projectId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [
    milestones,
    clientActions,
    agencyActions,
    changeRequests,
    supportRequests,
    files,
    comments,
    activity,
    subscription,
    handover,
  ] = await Promise.all([
    supabase
      .from('project_milestones')
      .select('id, title, target_date, completed_at, position, owner_side')
      .eq('project_id', projectId)
      .order('position'),
    supabase
      .from('tasks')
      .select('id, title, due_date, status, priority')
      .eq('project_id', projectId)
      .eq('responsibility', 'client')
      .neq('status', 'complete')
      .is('deleted_at', null)
      .order('due_date', { nullsFirst: false })
      .limit(6),
    supabase
      .from('tasks')
      .select('id, title, due_date, status, priority, assignee_id, users:users!tasks_assignee_id_fkey ( full_name )')
      .eq('project_id', projectId)
      .eq('responsibility', 'agency')
      .neq('status', 'complete')
      .is('deleted_at', null)
      .order('due_date', { nullsFirst: false })
      .limit(6),
    supabase
      .from('change_requests')
      .select('id, reference, title, status, priority, submitted_at')
      .eq('project_id', projectId)
      .in('status', OPEN_CHANGE_STATUSES)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase
      .from('support_requests')
      .select('id, reference, subject, status, urgency, submitted_at')
      .eq('project_id', projectId)
      .in('status', OPEN_SUPPORT_STATUSES)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase
      .from('files')
      .select('id, file_name, category, approval_status, created_at, size_bytes, mime_type')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('comments')
      .select('id, body, is_internal, created_at, entity_type, users:users!comments_author_id_fkey ( full_name )')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('activity_logs')
      .select('id, action, summary, created_at, actor_name, visibility')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('maintenance_subscriptions')
      .select('id, status, renewal_date, price, currency, billing_cycle, maintenance_plans ( id, name )')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('handovers')
      .select('id, status, website_url, delivered_at')
      .eq('project_id', projectId)
      .maybeSingle(),
  ]);

  const overdueClientActions = (clientActions.data ?? []).filter(
    (t) => t.due_date && t.due_date < today,
  ).length;

  return {
    milestones: milestones.data ?? [],
    clientActions: clientActions.data ?? [],
    agencyActions: agencyActions.data ?? [],
    overdueClientActions,
    changeRequests: changeRequests.data ?? [],
    supportRequests: supportRequests.data ?? [],
    files: files.data ?? [],
    comments: comments.data ?? [],
    activity: activity.data ?? [],
    subscription: subscription.data,
    handover: handover.data,
  };
}

export async function getLifecycleStages() {

  const { data } = await supabase
    .from('lifecycle_stages')
    .select('id, key, label, colour, position, is_active')
    .eq('is_active', true)
    .order('position');

  return data ?? [];
}

export async function getAgencyStaff() {

  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .not('role', 'in', '("client_owner","client_member")')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('full_name');

  return data ?? [];
}
