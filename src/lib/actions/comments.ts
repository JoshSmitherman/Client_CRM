'use server';

import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { requireUser } from '@/lib/auth';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';
import { errorState, successState, zodErrors, type ActionState } from './types';
import { z } from 'zod';
import { formObject, optionalUuid, requiredText, uuid } from '@/lib/validation/common';

const commentSchema = z.object({
  entityType: z.enum([
    'project',
    'task',
    'file',
    'website_page',
    'change_request',
    'support_request',
    'onboarding_section',
    'handover_item',
    'milestone',
  ]),
  entityId: uuid,
  projectId: optionalUuid,
  clientId: optionalUuid,
  parentId: optionalUuid,
  body: requiredText('Comment', 20000),
  isInternal: z
    .union([z.literal('on'), z.literal(''), z.undefined()])
    .transform((v) => v === 'on'),
});

/**
 * Adds a comment or a reply.
 *
 * `isInternal` is silently forced to false for client users rather than
 * trusted from the form — and the database refuses it regardless, because the
 * INSERT policy on `comments` checks it too.
 */
export async function addCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const parsed = commentSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Your comment could not be saved.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const agency = isAgency(session.profile.role);
  const isInternal = agency ? input.isInternal : false;

  const supabase = await createClient();

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      entity_type: input.entityType as Enums<'comment_entity'>,
      entity_id: input.entityId,
      project_id: input.projectId ?? null,
      client_id: input.clientId ?? null,
      parent_id: input.parentId ?? null,
      author_id: session.userId,
      body: input.body,
      is_internal: isInternal,
    })
    .select('id')
    .single();

  if (error || !comment) {
    return errorState(`Could not post the comment: ${error?.message ?? 'unknown error'}`);
  }

  // Internal notes never generate a client notification.
  if (!isInternal) {
    const targets = input.projectId
      ? [
          ...(await projectNotificationTargets(input.projectId)),
          ...(input.clientId ? await clientNotificationTargets(input.clientId) : []),
        ]
      : input.clientId
        ? await clientNotificationTargets(input.clientId)
        : [];

    await notify({
      userIds: targets,
      type: 'comment_added',
      title: `${session.profile.full_name || 'Someone'} commented`,
      body: input.body.slice(0, 160),
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      url: input.projectId ? `/projects/${input.projectId}/comments` : undefined,
    });
  } else {
    // Internal notes still reach the agency team.
    if (input.projectId) {
      await notify({
        userIds: await projectNotificationTargets(input.projectId),
        type: 'comment_added',
        title: `Internal note from ${session.profile.full_name || 'a colleague'}`,
        body: input.body.slice(0, 160),
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        url: `/projects/${input.projectId}/comments`,
      });
    }
  }

  await recordActivity({
    projectId: input.projectId ?? null,
    clientId: input.clientId ?? null,
    action: 'comment.added',
    summary: isInternal ? 'An internal note was added' : 'A comment was added',
    entityType: input.entityType,
    entityId: input.entityId,
    visibility: isInternal ? 'internal' : 'client',
    actorName: session.profile.full_name,
  });

  revalidatePath('/', 'layout');
  return successState();
}

/** Soft-deletes a comment. Only the author or an administrator may do this. */
export async function deleteCommentAction(commentId: string): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id, project_id')
    .eq('id', commentId)
    .maybeSingle();

  if (!comment) return;

  const allowed =
    comment.author_id === session.userId || session.profile.role === 'agency_admin';
  if (!allowed) throw new Error('You can only delete your own comments.');

  await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);

  revalidatePath('/', 'layout');
}
