/**
 * Permanent deletion of a client or a project.
 *
 * The rest of the application soft-deletes: `deleted_at` is set, the row drops
 * out of every query, and the history stays intact. That is the right default,
 * and it is what the archive actions still do.
 *
 * This is the other thing — for a client added by mistake, a test project, or
 * a real request to erase a record. It is not reversible.
 *
 * Two details make it more than a DELETE statement:
 *
 *   The database cascades. Deleting a client takes its projects, files rows,
 *   change requests, support tickets, subscriptions and internal notes with
 *   it; deleting a project takes its tasks, pages, comments and handover. That
 *   is the intended behaviour, and it is why the confirmation says what will
 *   go.
 *
 *   The cascade cannot reach Supabase Storage. Deleting the `files` rows
 *   leaves the actual bytes in the bucket with nothing pointing at them — no
 *   row to look up, so no signed URL can ever be made, and they simply consume
 *   quota forever. So the objects are removed first, while the rows that name
 *   them still exist.
 */
import { AuditAction, recordAudit } from '@/lib/audit';
import { currentUser } from '@/lib/session';
import { isAgencyManager } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';

/**
 * Mirrors the clients_delete and projects_delete policies, which allow a
 * project manager or an administrator. This is for the error message; the
 * policy is what refuses.
 */
async function requireManager() {
  const session = await currentUser();
  if (!isAgencyManager(session.profile.role)) {
    throw new Error('Only a project manager or an administrator can delete records.');
  }
  return session;
}

/** What a delete would take with it, so the confirmation can be specific. */
export interface DeletionImpact {
  projects: number;
  files: number;
  changeRequests: number;
  supportRequests: number;
  subscriptions: number;
}

async function countFor(column: 'client_id' | 'project_id', id: string): Promise<DeletionImpact> {
  const count = async (table: string) => {
    const { count: n } = await supabase
      .from(table as 'files')
      .select('id', { count: 'exact', head: true })
      .eq(column, id);
    return n ?? 0;
  };

  const [projects, files, changeRequests, supportRequests, subscriptions] = await Promise.all([
    column === 'client_id' ? count('projects') : Promise.resolve(0),
    count('files'),
    count('change_requests'),
    count('support_requests'),
    count('maintenance_subscriptions'),
  ]);

  return { projects, files, changeRequests, supportRequests, subscriptions };
}

export function getClientDeletionImpact(clientId: string): Promise<DeletionImpact> {
  return countFor('client_id', clientId);
}

export function getProjectDeletionImpact(projectId: string): Promise<DeletionImpact> {
  return countFor('project_id', projectId);
}

/**
 * Clears the bucket for a set of files before their rows disappear.
 *
 * Best effort by design: a storage object that refuses to go is not a reason
 * to leave the record undeleted, and the alternative — aborting halfway — is
 * worse than a few orphaned bytes.
 */
async function removeStoredFiles(column: 'client_id' | 'project_id', id: string): Promise<void> {
  const { data } = await supabase.from('files').select('bucket, storage_path').eq(column, id);

  const byBucket = new Map<string, string[]>();
  for (const file of data ?? []) {
    const paths = byBucket.get(file.bucket) ?? [];
    paths.push(file.storage_path);
    byBucket.set(file.bucket, paths);
  }

  for (const [bucket, paths] of byBucket) {
    // Storage takes a limited number of keys per call.
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) console.error('[destroy] could not remove stored files', error.message);
    }
  }
}

export async function deleteClientPermanentlyAction(clientId: string): Promise<void> {
  await requireManager();

  const { data: client } = await supabase
    .from('clients')
    .select('company_name, organisation_id')
    .eq('id', clientId)
    .maybeSingle();

  if (!client) throw new Error('That client could not be found.');

  // Written before the row goes, so the log still names it. audit_logs has no
  // delete policy for anyone, so this entry outlives the record permanently.
  await recordAudit({
    action: AuditAction.ClientPurged,
    entityType: 'client',
    entityId: clientId,
    previousValue: { company_name: client.company_name },
  });

  await removeStoredFiles('client_id', clientId);

  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) throw new Error(`Could not delete the client: ${error.message}`);
}

export async function deleteProjectPermanentlyAction(projectId: string): Promise<void> {
  await requireManager();

  const { data: project } = await supabase
    .from('projects')
    .select('name, reference, client_id')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) throw new Error('That project could not be found.');

  await recordAudit({
    action: AuditAction.ProjectPurged,
    entityType: 'project',
    entityId: projectId,
    previousValue: { name: project.name, reference: project.reference },
  });

  await removeStoredFiles('project_id', projectId);

  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw new Error(`Could not delete the project: ${error.message}`);
}
