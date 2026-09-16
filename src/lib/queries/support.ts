import { OPEN_SUPPORT_STATUSES } from '@/lib/constants';
import { supabase } from '@/lib/supabase/client';
import type { Enums } from '@/lib/supabase/database.types';

const LIST_SELECT = `
  id, reference, subject, category, status, urgency, covered_by_plan,
  submitted_at, client_id, project_id,
  clients!inner ( id, company_name ),
  projects ( id, name ),
  assignee:users!support_requests_assigned_to_fkey ( id, full_name )
`;

export async function getSupportRequests(
  filters: {
    status?: Enums<'support_status'>;
    urgency?: Enums<'urgency'>;
    clientId?: string;
    projectId?: string;
    assignedTo?: string;
    openOnly?: boolean;
    search?: string;
  } = {},
  limit = 100,
) {

  let query = supabase
    .from('support_requests')
    .select(LIST_SELECT)
    .is('deleted_at', null)
    // Most urgent first, then oldest, because a critical ticket sitting for two
    // days is the thing most worth surfacing.
    .order('urgency', { ascending: false })
    .order('submitted_at', { ascending: true })
    .limit(limit);

  if (filters.status) query = query.eq('status', filters.status);
  else if (filters.openOnly) query = query.in('status', OPEN_SUPPORT_STATUSES);

  if (filters.urgency) query = query.eq('urgency', filters.urgency);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

  if (filters.search) {
    const term = `%${filters.search.replace(/[%_]/g, '')}%`;
    query = query.or(`subject.ilike.${term},reference.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load support requests: ${error.message}`);
  return data ?? [];
}

export async function getSupportRequest(requestId: string) {

  const { data, error } = await supabase
    .from('support_requests')
    .select(
      `*,
       clients!inner ( id, company_name ),
       projects ( id, name ),
       assignee:users!support_requests_assigned_to_fkey ( id, full_name ),
       submitter:users!support_requests_submitted_by_fkey ( id, full_name ),
       maintenance_subscriptions ( id, status, maintenance_plans ( name, response_time_hours ) )`,
    )
    .eq('id', requestId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load support request: ${error.message}`);
  return data;
}
