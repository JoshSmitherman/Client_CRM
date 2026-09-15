import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';
import { OPEN_CHANGE_STATUSES, OPEN_SUPPORT_STATUSES } from '@/lib/constants';
import { addDays } from './badges';

export interface DashboardFilters {
  clientId?: string;
  projectId?: string;
  staffId?: string;
  stageKey?: string;
  projectType?: Enums<'project_type'>;
  planId?: string;
  minCompletion?: number;
  maxCompletion?: number;
  search?: string;
}

export interface DashboardStats {
  activeClients: number;
  activeProjects: number;
  onboarding: number;
  inDevelopment: number;
  awaitingApproval: number;
  awaitingContent: number;
  nearingHandover: number;
  openChangeRequests: number;
  openSupportRequests: number;
  activeSubscriptions: number;
  renewalsDueSoon: number;
  overdueClientActions: number;
}

export interface ProjectRow {
  id: string;
  reference: string;
  name: string;
  project_type: Enums<'project_type'>;
  completion_percentage: number;
  health: string;
  target_launch_date: string | null;
  updated_at: string;
  clients: { id: string; company_name: string } | null;
  lifecycle_stages: { key: string; label: string; colour: string } | null;
}

const PROJECT_SELECT = `
  id, reference, name, project_type, completion_percentage, health,
  target_launch_date, updated_at,
  clients!inner ( id, company_name ),
  lifecycle_stages ( key, label, colour )
`;

/**
 * Dashboard KPI tiles.
 *
 * Every count is a head-only query, so the browser receives numbers rather than
 * rows, and RLS narrows each figure to what this user is allowed to see.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in30Days = addDays(today, 30);

  const countProjectsInStage = (keys: string[]) =>
    supabase
      .from('projects')
      .select('id, lifecycle_stages!inner(key)', { count: 'exact', head: true })
      .in('lifecycle_stages.key', keys)
      .is('deleted_at', null)
      .is('archived_at', null);

  const [
    activeClients,
    activeProjects,
    onboarding,
    inDevelopment,
    awaitingApproval,
    awaitingContent,
    nearingHandover,
    openChangeRequests,
    openSupportRequests,
    activeSubscriptions,
    renewalsDueSoon,
    overdueClientActions,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('archived_at', null),
    countProjectsInStage(['onboarding', 'lead_converted']),
    countProjectsInStage(['development', 'design']),
    countProjectsInStage(['client_review', 'final_approval']),
    countProjectsInStage(['awaiting_content']),
    countProjectsInStage(['launch_prep', 'handover']),
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
      .from('maintenance_subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trial', 'renewal_due'])
      .is('deleted_at', null),
    supabase
      .from('maintenance_subscriptions')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trial', 'renewal_due'])
      .lte('renewal_date', in30Days)
      .is('deleted_at', null),
    // Overdue tasks that are the client's responsibility — the single most
    // useful "why is this project stuck" signal.
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('responsibility', 'client')
      .neq('status', 'complete')
      .lt('due_date', today)
      .is('deleted_at', null),
  ]);

  return {
    activeClients: activeClients.count ?? 0,
    activeProjects: activeProjects.count ?? 0,
    onboarding: onboarding.count ?? 0,
    inDevelopment: inDevelopment.count ?? 0,
    awaitingApproval: awaitingApproval.count ?? 0,
    awaitingContent: awaitingContent.count ?? 0,
    nearingHandover: nearingHandover.count ?? 0,
    openChangeRequests: openChangeRequests.count ?? 0,
    openSupportRequests: openSupportRequests.count ?? 0,
    activeSubscriptions: activeSubscriptions.count ?? 0,
    renewalsDueSoon: renewalsDueSoon.count ?? 0,
    overdueClientActions: overdueClientActions.count ?? 0,
  };
}

/** Filtered project list backing both the dashboard and /projects. */
export async function getProjects(filters: DashboardFilters = {}, limit = 50) {
  const supabase = await createClient();

  let query = supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.projectId) query = query.eq('id', filters.projectId);
  if (filters.projectType) query = query.eq('project_type', filters.projectType);
  if (filters.stageKey) query = query.eq('lifecycle_stages.key', filters.stageKey);
  if (filters.minCompletion !== undefined) {
    query = query.gte('completion_percentage', filters.minCompletion);
  }
  if (filters.maxCompletion !== undefined) {
    query = query.lte('completion_percentage', filters.maxCompletion);
  }

  // Search across both the project name and its client's company name.
  if (filters.search) {
    const term = `%${filters.search.replace(/[%_]/g, '')}%`;
    query = query.or(`name.ilike.${term},reference.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load projects: ${error.message}`);

  let rows = (data ?? []) as unknown as ProjectRow[];

  // Staff and plan filters need a membership/subscription lookup, so they are
  // applied after the main query rather than as a join that would drop rows.
  if (filters.staffId) {
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', filters.staffId);
    const allowed = new Set((memberships ?? []).map((m) => m.project_id));
    rows = rows.filter((p) => allowed.has(p.id));
  }

  if (filters.planId) {
    const { data: subs } = await supabase
      .from('maintenance_subscriptions')
      .select('project_id')
      .eq('plan_id', filters.planId)
      .is('deleted_at', null);
    const allowed = new Set((subs ?? []).map((s) => s.project_id).filter(Boolean) as string[]);
    rows = rows.filter((p) => allowed.has(p.id));
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    // Client-name matches cannot be expressed in the .or() above (it only
    // covers the projects table), so widen the result here.
    const { data: byClient } = await supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .is('deleted_at', null)
      .ilike('clients.company_name', `%${term}%`)
      .limit(limit);

    const extra = ((byClient ?? []) as unknown as ProjectRow[]).filter(
      (p) => p.clients && !rows.some((r) => r.id === p.id),
    );
    rows = [...rows, ...extra];
  }

  return rows;
}

/** Items needing agency attention, grouped for the dashboard panels. */
export async function getAttentionLists() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [submissions, quotes, overdueTasks, renewals, criticalTickets] = await Promise.all([
    supabase
      .from('onboarding_sections')
      .select('id, title, submitted_at, project_id, projects!inner(name, clients!inner(company_name))')
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true })
      .limit(6),
    supabase
      .from('change_requests')
      .select('id, reference, title, submitted_at, project_id, clients!inner(company_name)')
      .in('status', ['awaiting_review', 'quotation_required'])
      .is('deleted_at', null)
      .order('submitted_at', { ascending: true })
      .limit(6),
    supabase
      .from('tasks')
      .select('id, title, due_date, responsibility, project_id, projects!inner(name)')
      .neq('status', 'complete')
      .lt('due_date', today)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(6),
    supabase
      .from('renewal_reminders')
      .select('id, title, due_date, reminder_type, status, clients!inner(id, company_name)')
      .in('status', ['scheduled', 'due'])
      .lte('due_date', addDays(today, 60))
      .order('due_date', { ascending: true })
      .limit(6),
    supabase
      .from('support_requests')
      .select('id, reference, subject, urgency, submitted_at, clients!inner(company_name)')
      .in('status', OPEN_SUPPORT_STATUSES)
      .in('urgency', ['high', 'critical'])
      .is('deleted_at', null)
      .order('submitted_at', { ascending: true })
      .limit(6),
  ]);

  return {
    submissions: submissions.data ?? [],
    quotes: quotes.data ?? [],
    overdueTasks: overdueTasks.data ?? [],
    renewals: renewals.data ?? [],
    criticalTickets: criticalTickets.data ?? [],
  };
}

/** Options for the dashboard and project-index filter bar. */
export async function getFilterOptions() {
  const supabase = await createClient();

  const [clients, staff, stages, plans] = await Promise.all([
    supabase
      .from('clients')
      .select('id, company_name')
      .is('deleted_at', null)
      .order('company_name'),
    supabase
      .from('users')
      .select('id, full_name')
      .not('role', 'in', '("client_owner","client_member")')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name'),
    supabase
      .from('lifecycle_stages')
      .select('key, label')
      .eq('is_active', true)
      .order('position'),
    supabase
      .from('maintenance_plans')
      .select('id, name')
      .eq('is_active', true)
      .order('position'),
  ]);

  return {
    clients: clients.data ?? [],
    staff: staff.data ?? [],
    stages: stages.data ?? [],
    plans: plans.data ?? [],
  };
}
