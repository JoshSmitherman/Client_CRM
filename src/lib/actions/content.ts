'use server';

import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { clientNotificationTargets, notify, projectNotificationTargets } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { formObject } from '@/lib/validation/common';
import { pageContentSchema, pageSchema } from '@/lib/validation/content';
import type { Json } from '@/lib/supabase/database.types';
import { errorState, successState, zodErrors, type ActionState } from './types';

export async function createPageAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can add pages to the sitemap.');
  }

  const parsed = pageSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  // New pages go to the end of their level.
  const { count } = await supabase
    .from('website_pages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('deleted_at', null);

  const { error } = await supabase.from('website_pages').insert({
    project_id: projectId,
    parent_id: input.parentId ?? null,
    title: input.title,
    slug: input.slug ? slugify(input.slug) : slugify(input.title),
    page_kind: input.pageKind,
    in_navigation: input.inNavigation,
    purpose: input.purpose ?? null,
    position: (count ?? 0) + 1,
    created_by: session.userId,
  });

  if (error) return errorState(`Could not add the page: ${error.message}`);

  revalidatePath(`/projects/${projectId}/content`);
  return successState('Page added.');
}

/**
 * Saves page content as a draft or submits it for review.
 *
 * Shared by the agency workspace and the client portal: RLS decides which rows
 * each may touch, and the column guard stops a client setting approval fields.
 */
export async function savePageContentAction(
  pageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();

  const parsed = pageContentSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const submitting = String(formData.get('intent') ?? 'save') === 'submit';
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('website_pages')
    .select('title, status, project_id, projects ( client_id, name )')
    .eq('id', pageId)
    .maybeSingle();

  if (!before) return errorState('That page could not be found.');

  // Calls to action are entered one per line; stored as an array.
  const callsToAction = (input.callsToAction ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const nextStatus = submitting
    ? 'submitted'
    : before.status === 'approved'
      ? 'approved'
      : 'draft';

  const { error } = await supabase
    .from('website_pages')
    .update({
      title: input.title,
      purpose: input.purpose ?? null,
      main_heading: input.mainHeading ?? null,
      body_copy: input.bodyCopy ?? null,
      calls_to_action: callsToAction as unknown as Json,
      seo_title: input.seoTitle ?? null,
      meta_description: input.metaDescription ?? null,
      notes: input.notes ?? null,
      status: nextStatus,
      ...(submitting
        ? { submitted_at: new Date().toISOString(), submitted_by: session.userId }
        : {}),
    })
    .eq('id', pageId);

  if (error) return errorState(`Could not save the page: ${error.message}`);

  const project = before.projects as unknown as { client_id: string; name: string } | null;

  if (submitting) {
    await Promise.all([
      recordActivity({
        projectId: before.project_id,
        clientId: project?.client_id ?? null,
        action: 'page.submitted',
        summary: `Content for "${input.title}" was submitted`,
        entityType: 'website_page',
        entityId: pageId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
      notify({
        userIds: await projectNotificationTargets(before.project_id),
        type: 'onboarding_submitted',
        title: `Page content submitted: ${input.title}`,
        body: project?.name ?? undefined,
        projectId: before.project_id,
        entityType: 'website_page',
        entityId: pageId,
        url: `/projects/${before.project_id}/content/${pageId}`,
      }),
    ]);
  }

  revalidatePath('/', 'layout');
  return successState(
    submitting ? 'Submitted for review.' : 'Saved. You can come back to this later.',
  );
}

/** Agency review decision on submitted page content. */
export async function reviewPageAction(
  pageId: string,
  decision: 'approved' | 'needs_changes',
  feedback?: string,
): Promise<void> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    throw new Error('Only agency users can approve page content.');
  }

  if (decision === 'needs_changes' && !feedback?.trim()) {
    throw new Error('Explain what the client needs to change.');
  }

  const supabase = await createClient();

  const { data: page } = await supabase
    .from('website_pages')
    .select('title, status, project_id, projects ( client_id )')
    .eq('id', pageId)
    .maybeSingle();

  if (!page) throw new Error('Page not found.');

  const { error } = await supabase
    .from('website_pages')
    .update({
      status: decision,
      agency_feedback: feedback?.trim() || null,
      ...(decision === 'approved'
        ? { approved_at: new Date().toISOString(), approved_by: session.userId }
        : { approved_at: null, approved_by: null }),
    })
    .eq('id', pageId);

  if (error) throw new Error(error.message);

  const clientId = (page.projects as unknown as { client_id: string } | null)?.client_id ?? null;

  await Promise.all([
    recordAudit({
      action: decision === 'approved' ? AuditAction.Approved : AuditAction.ChangesRequested,
      entityType: 'website_page',
      entityId: pageId,
      previousValue: { status: page.status },
      newValue: { status: decision, feedback: feedback ?? null },
    }),
    supabase.from('approvals').insert({
      project_id: page.project_id,
      client_id: clientId,
      entity_type: 'website_page',
      entity_id: pageId,
      decision: decision === 'approved' ? 'approved' : 'changes_requested',
      reason: feedback?.trim() || null,
      previous_status: page.status,
      new_status: decision,
      decided_by: session.userId,
    }),
    recordActivity({
      projectId: page.project_id,
      clientId,
      action: decision === 'approved' ? 'page.approved' : 'page.changes_requested',
      summary:
        decision === 'approved'
          ? `Content for "${page.title}" was approved`
          : `Content for "${page.title}" needs changes`,
      entityType: 'website_page',
      entityId: pageId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
    clientId
      ? notify({
          userIds: await clientNotificationTargets(clientId),
          type: decision === 'approved' ? 'approval_received' : 'changes_requested',
          title:
            decision === 'approved'
              ? `${page.title} approved`
              : `${page.title} needs changes`,
          body: feedback?.trim() || undefined,
          projectId: page.project_id,
          clientId,
          entityType: 'website_page',
          entityId: pageId,
          url: `/portal/projects/${page.project_id}/content/${pageId}`,
        })
      : Promise.resolve(),
  ]);

  revalidatePath('/', 'layout');
}

/** Reorders a page within the sitemap. */
export async function movePageAction(pageId: string, direction: 'up' | 'down'): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: page } = await supabase
    .from('website_pages')
    .select('id, project_id, parent_id, position')
    .eq('id', pageId)
    .maybeSingle();

  if (!page) return;

  // Swap with the adjacent sibling at the same level.
  const query = supabase
    .from('website_pages')
    .select('id, position')
    .eq('project_id', page.project_id)
    .is('deleted_at', null);

  const siblings = page.parent_id
    ? await query.eq('parent_id', page.parent_id)
    : await query.is('parent_id', null);

  const ordered = (siblings.data ?? []).sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((p) => p.id === pageId);
  const swapWith = direction === 'up' ? ordered[index - 1] : ordered[index + 1];

  if (!swapWith) return;

  await Promise.all([
    supabase.from('website_pages').update({ position: swapWith.position }).eq('id', pageId),
    supabase.from('website_pages').update({ position: page.position }).eq('id', swapWith.id),
  ]);

  revalidatePath(`/projects/${page.project_id}/content`);
}

export async function deletePageAction(pageId: string): Promise<void> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) throw new Error('Only agency users can remove pages.');

  const supabase = await createClient();

  const { data: page } = await supabase
    .from('website_pages')
    .select('project_id')
    .eq('id', pageId)
    .maybeSingle();

  await supabase
    .from('website_pages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', pageId);

  if (page) revalidatePath(`/projects/${page.project_id}/content`);
}
