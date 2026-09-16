import { supabase } from '@/lib/supabase/client';
import type { Enums, Json } from '@/lib/supabase/database.types';

/**
 * Appends to the project activity feed — the chronological record shown on the
 * project Activity tab and on each change request's timeline.
 *
 * `visibility` decides whether the client sees the entry. The SELECT policy on
 * activity_logs enforces it; this argument only sets the value.
 */
export async function recordActivity(params: {
  projectId?: string | null;
  clientId?: string | null;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Json;
  visibility?: Enums<'activity_visibility'>;
  actorName?: string | null;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('activity_logs').insert({
      project_id: params.projectId ?? null,
      client_id: params.clientId ?? null,
      actor_id: user?.id ?? null,
      actor_name: params.actorName ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      summary: params.summary,
      metadata: params.metadata ?? {},
      visibility: params.visibility ?? 'internal',
    });

    if (error) console.error('[activity] failed to record', params.action, error.message);
  } catch (error) {
    console.error('[activity] unexpected failure', error);
  }
}
