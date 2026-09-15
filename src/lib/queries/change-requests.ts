import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { OPEN_CHANGE_STATUSES } from '@/lib/constants';
import type { Enums } from '@/lib/supabase/database.types';

export interface ChangeRequestFilters {
  status?: Enums<'change_request_status'>;
  clientId?: string;
  projectId?: string;
  assignedTo?: string;
  openOnly?: boolean;
  search?: string;
}

const LIST_SELECT = `
  id, reference, title, category, status, priority, billing_treatment,
  submitted_at, estimated_completion_date, estimated_cost, project_id, client_id,
  clients!inner ( id, company_name ),
  projects!inner ( id, name ),
  assignee:users!change_requests_assigned_to_fkey ( id, full_name )
`;

export async function getChangeRequests(filters: ChangeRequestFilters = {}, limit = 100) {
  const supabase = await createClient();

  let query = supabase
    .from('change_requests')
    .select(LIST_SELECT)
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (filters.status) query = query.eq('status', filters.status);
  else if (filters.openOnly) query = query.in('status', OPEN_CHANGE_STATUSES);

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

  if (filters.search) {
    const term = `%${filters.search.replace(/[%_]/g, '')}%`;
    query = query.or(`title.ilike.${term},reference.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load change requests: ${error.message}`);

  return data ?? [];
}

export async function getChangeRequest(requestId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('change_requests')
    .select(
      `*,
       clients!inner ( id, company_name ),
       projects!inner ( id, name ),
       assignee:users!change_requests_assigned_to_fkey ( id, full_name ),
       submitter:users!change_requests_submitted_by_fkey ( id, full_name )`,
    )
    .eq('id', requestId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load change request: ${error.message}`);
  return data;
}

/** Every quote round, newest first, so the whole negotiation is visible. */
export async function getChangeRequestQuotes(requestId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('change_request_approvals')
    .select(
      `*,
       offered_by_user:users!change_request_approvals_offered_by_fkey ( full_name ),
       decided_by_user:users!change_request_approvals_decided_by_fkey ( full_name )`,
    )
    .eq('change_request_id', requestId)
    .order('offered_at', { ascending: false });

  return data ?? [];
}

/** The permanent per-request timeline, drawn from activity_logs. */
export async function getChangeRequestTimeline(requestId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('activity_logs')
    .select('id, action, summary, created_at, actor_name, visibility')
    .eq('entity_type', 'change_request')
    .eq('entity_id', requestId)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getChangeRequestAttachments(requestId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('files')
    .select(
      `id, file_name, original_name, mime_type, size_bytes, category, description,
       approval_status, review_notes, created_at, uploaded_by,
       uploader:users!files_uploaded_by_fkey ( full_name )`,
    )
    .eq('change_request_id', requestId)
    .is('deleted_at', null)
    .order('created_at');

  return data ?? [];
}
