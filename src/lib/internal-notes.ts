import { supabase } from '@/lib/supabase/client';

/**
 * Agency-only free text.
 *
 * These notes deliberately do not live on the entity tables. Row Level Security
 * restricts rows, not columns — so a note stored on a change request the client
 * is allowed to read would be readable by that client straight from the API,
 * which matters all the more now the browser talks to that API directly.
 *
 * `public.internal_notes` has no client policy at all, so there is nothing to
 * remember not to select.
 */
export type InternalNoteEntity =
  | 'client'
  | 'project'
  | 'project_plan'
  | 'change_request'
  | 'support_request'
  | 'maintenance_subscription';

export async function getInternalNote(
  entityType: InternalNoteEntity,
  entityId: string,
): Promise<string> {
  const { data } = await supabase
    .from('internal_notes')
    .select('body')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .maybeSingle();

  return data?.body ?? '';
}

/** Fetches several notes at once, for a list view. */
export async function getInternalNotes(
  entityType: InternalNoteEntity,
  entityIds: string[],
): Promise<Map<string, string>> {
  if (entityIds.length === 0) return new Map();

  const { data } = await supabase
    .from('internal_notes')
    .select('entity_id, body')
    .eq('entity_type', entityType)
    .in('entity_id', entityIds);

  return new Map((data ?? []).map((row) => [row.entity_id, row.body]));
}

/**
 * Writes a note, or removes it when the text is cleared.
 *
 * Never throws: a note failing to save must not fail the work it was attached
 * to, but it must be visible in the console.
 */
export async function setInternalNote(params: {
  entityType: InternalNoteEntity;
  entityId: string;
  body: string | null | undefined;
  projectId?: string | null;
  clientId?: string | null;
  userId: string;
}): Promise<void> {
  const body = (params.body ?? '').trim();

  try {
    if (!body) {
      await supabase
        .from('internal_notes')
        .delete()
        .eq('entity_type', params.entityType)
        .eq('entity_id', params.entityId);
      return;
    }

    const { error } = await supabase.from('internal_notes').upsert(
      {
        entity_type: params.entityType,
        entity_id: params.entityId,
        project_id: params.projectId ?? null,
        client_id: params.clientId ?? null,
        body,
        updated_by: params.userId,
      },
      { onConflict: 'entity_type,entity_id' },
    );

    if (error) console.error('[internal-notes] failed to save', params.entityType, error.message);
  } catch (error) {
    console.error('[internal-notes] unexpected failure', error);
  }
}
