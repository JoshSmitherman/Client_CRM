import { supabase } from '@/lib/supabase/client';
import type { Enums } from '@/lib/supabase/database.types';

export interface NotificationInput {
  userIds: string[];
  type: Enums<'notification_type'>;
  title: string;
  body?: string;
  url?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string | null;
  clientId?: string | null;
}

/**
 * In-app notifications.
 *
 * `delivered_email_at` already exists on the table, so adding an email
 * transport later means sending from this one function and stamping that
 * column — no schema change and no new call sites.
 */
export async function notify(input: NotificationInput): Promise<void> {
  const recipients = [...new Set(input.userIds)].filter(Boolean);
  if (recipients.length === 0) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Never notify someone about their own action.
    const targets = recipients.filter((id) => id !== user?.id);
    if (targets.length === 0) return;

    const { error } = await supabase.from('notifications').insert(
      targets.map((userId) => ({
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        url: input.url ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        project_id: input.projectId ?? null,
        client_id: input.clientId ?? null,
        actor_id: user?.id ?? null,
      })),
    );

    if (error) console.error('[notify] failed', input.type, error.message);
  } catch (error) {
    console.error('[notify] unexpected failure', error);
  }
}

/** Agency users who should hear about activity on a project. */
export async function projectNotificationTargets(projectId: string): Promise<string[]> {

  const [{ data: members }, { data: admins }] = await Promise.all([
    supabase.from('project_members').select('user_id').eq('project_id', projectId),
    supabase
      .from('users')
      .select('id')
      .in('role', ['agency_admin', 'project_manager'])
      .eq('is_active', true)
      .is('deleted_at', null),
  ]);

  return [...(members ?? []).map((m) => m.user_id), ...(admins ?? []).map((a) => a.id)];
}

/** Portal users belonging to a client organisation. */
export async function clientNotificationTargets(clientId: string): Promise<string[]> {

  const { data: client } = await supabase
    .from('clients')
    .select('organisation_id')
    .eq('id', clientId)
    .maybeSingle();

  if (!client?.organisation_id) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('organisation_id', client.organisation_id)
    .eq('is_active', true)
    .is('deleted_at', null);

  return (users ?? []).map((u) => u.id);
}
