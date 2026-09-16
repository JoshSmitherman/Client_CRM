import { supabase } from '@/lib/supabase/client';
import type { Enums, Tables } from '@/lib/supabase/database.types';

export interface CommentNode extends Tables<'comments'> {
  author: { id: string; full_name: string; role: string } | null;
  replies: CommentNode[];
}

/**
 * Loads a comment thread and nests replies under their parent.
 *
 * No internal-comment filter appears here on purpose: the SELECT policy on
 * `comments` already excludes them for client users, so an omission in this
 * file cannot leak one.
 */
export async function getComments(params: {
  entityType: Enums<'comment_entity'>;
  entityId: string;
}): Promise<CommentNode[]> {

  const { data, error } = await supabase
    .from('comments')
    .select('*, author:users!comments_author_id_fkey ( id, full_name, role )')
    .eq('entity_type', params.entityType)
    .eq('entity_id', params.entityId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load comments: ${error.message}`);

  return nest((data ?? []) as unknown as CommentNode[]);
}

/** All comments on a project, whatever they are attached to. */
export async function getProjectComments(projectId: string): Promise<CommentNode[]> {

  const { data, error } = await supabase
    .from('comments')
    .select('*, author:users!comments_author_id_fkey ( id, full_name, role )')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load comments: ${error.message}`);

  return nest((data ?? []) as unknown as CommentNode[]);
}

function nest(rows: CommentNode[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const row of rows) {
    byId.set(row.id, { ...row, replies: [] });
  }

  for (const row of rows) {
    const node = byId.get(row.id)!;
    const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
}
