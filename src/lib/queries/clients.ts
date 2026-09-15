import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { OPEN_CHANGE_STATUSES, OPEN_SUPPORT_STATUSES } from '@/lib/constants';

export async function getClients(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('clients')
    .select(
      `id, company_name, trading_name, industry, email, phone, is_active, is_existing_client,
       created_at, account_manager_id,
       account_manager:users!clients_account_manager_id_fkey ( id, full_name )`,
    )
    .is('deleted_at', null)
    .order('company_name');

  if (search) {
    const term = `%${search.replace(/[%_]/g, '')}%`;
    query = query.or(`company_name.ilike.${term},trading_name.ilike.${term},email.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load clients: ${error.message}`);

  // Project counts in one round trip rather than N queries.
  const ids = (data ?? []).map((c) => c.id);
  const counts = new Map<string, number>();

  if (ids.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('client_id')
      .in('client_id', ids)
      .is('deleted_at', null)
      .is('archived_at', null);

    for (const row of projects ?? []) {
      counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1);
    }
  }

  return (data ?? []).map((client) => ({
    ...client,
    projectCount: counts.get(client.id) ?? 0,
  }));
}

export async function getClient(clientId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('clients')
    .select(
      `*, account_manager:users!clients_account_manager_id_fkey ( id, full_name, email ),
       organisations ( id, name, slug )`,
    )
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load client: ${error.message}`);
  return data;
}

/** Everything the client detail page shows alongside the record itself. */
export async function getClientOverview(clientId: string) {
  const supabase = await createClient();

  const [projects, subscriptions, changeRequests, supportRequests, contacts, activity] =
    await Promise.all([
      supabase
        .from('projects')
        .select('id, reference, name, project_type, completion_percentage, health, target_launch_date, updated_at, lifecycle_stages ( key, label, colour )')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase
        .from('maintenance_subscriptions')
        .select('id, status, renewal_date, billing_cycle, price, currency, website_url, maintenance_plans ( id, name )')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('renewal_date'),
      supabase
        .from('change_requests')
        .select('id, reference, title, status, priority, submitted_at')
        .eq('client_id', clientId)
        .in('status', OPEN_CHANGE_STATUSES)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(8),
      supabase
        .from('support_requests')
        .select('id, reference, subject, status, urgency, submitted_at')
        .eq('client_id', clientId)
        .in('status', OPEN_SUPPORT_STATUSES)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(8),
      getClientContacts(clientId),
      supabase
        .from('activity_logs')
        .select('id, action, summary, created_at, actor_name, visibility')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

  return {
    projects: projects.data ?? [],
    subscriptions: subscriptions.data ?? [],
    changeRequests: changeRequests.data ?? [],
    supportRequests: supportRequests.data ?? [],
    contacts,
    activity: activity.data ?? [],
  };
}

/** Portal users belonging to this client, plus any outstanding invitations. */
export async function getClientContacts(clientId: string) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('organisation_id')
    .eq('id', clientId)
    .maybeSingle();

  if (!client?.organisation_id) return { users: [], invitations: [] };

  const [users, invitations] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role, is_active, last_seen_at, job_title')
      .eq('organisation_id', client.organisation_id)
      .is('deleted_at', null)
      .order('full_name'),
    supabase
      .from('invitations')
      .select('id, email, full_name, role, expires_at, created_at')
      .eq('organisation_id', client.organisation_id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ]);

  return { users: users.data ?? [], invitations: invitations.data ?? [] };
}

/** Agency staff who can be set as account manager. */
export async function getAccountManagers() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('users')
    .select('id, full_name')
    .in('role', ['agency_admin', 'project_manager', 'account_manager'])
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('full_name');

  return data ?? [];
}
