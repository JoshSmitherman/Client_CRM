'use server';

import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { requireAgency } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formObject } from '@/lib/validation/common';
import {
  deliverableSchema,
  milestoneSchema,
  planSchema,
  riskSchema,
} from '@/lib/validation/projects';
import { errorState, successState, zodErrors, type ActionState } from './types';

export async function savePlanAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = planSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  // Projects created before the plan row existed, or created outside the app,
  // still need one — upsert rather than assume.
  const { error } = await supabase.from('project_plans').upsert(
    {
      project_id: projectId,
      scope: input.scope ?? null,
      objectives: input.objectives ?? null,
      client_responsibilities: input.clientResponsibilities ?? null,
      agency_responsibilities: input.agencyResponsibilities ?? null,
      notes: input.notes ?? null,
      updated_by: session.userId,
    },
    { onConflict: 'project_id' },
  );

  if (error) return errorState(`Could not save the plan: ${error.message}`);

  revalidatePath(`/projects/${projectId}/planning`);
  return successState('Plan saved.');
}

export async function addMilestoneAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = milestoneSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { count } = await supabase
    .from('project_milestones')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { error } = await supabase.from('project_milestones').insert({
    project_id: projectId,
    title: input.title,
    description: input.description ?? null,
    target_date: input.targetDate ?? null,
    owner_side: input.ownerSide,
    depends_on_id: input.dependsOnId ?? null,
    position: (count ?? 0) + 1,
    created_by: session.userId,
  });

  if (error) return errorState(`Could not add the milestone: ${error.message}`);

  revalidatePath(`/projects/${projectId}`, 'layout');
  return successState('Milestone added.');
}

/**
 * Toggling a milestone recalculates the project's completion percentage — the
 * trigger on project_milestones fires calculate_project_progress().
 */
export async function toggleMilestoneAction(
  milestoneId: string,
  complete: boolean,
): Promise<void> {
  const session = await requireAgency();
  const supabase = await createClient();

  const { data: milestone } = await supabase
    .from('project_milestones')
    .select('title, project_id, projects ( client_id )')
    .eq('id', milestoneId)
    .maybeSingle();

  if (!milestone) throw new Error('Milestone not found.');

  const { error } = await supabase
    .from('project_milestones')
    .update({
      completed_at: complete ? new Date().toISOString() : null,
      completed_by: complete ? session.userId : null,
    })
    .eq('id', milestoneId);

  if (error) throw new Error(error.message);

  if (complete) {
    await recordActivity({
      projectId: milestone.project_id,
      clientId: (milestone.projects as unknown as { client_id: string } | null)?.client_id ?? null,
      action: 'milestone.completed',
      summary: `Milestone "${milestone.title}" was reached`,
      entityType: 'milestone',
      entityId: milestoneId,
      visibility: 'client',
      actorName: session.profile.full_name,
    });
  }

  revalidatePath(`/projects/${milestone.project_id}`, 'layout');
}

export async function deleteMilestoneAction(milestoneId: string): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: milestone } = await supabase
    .from('project_milestones')
    .select('project_id')
    .eq('id', milestoneId)
    .maybeSingle();

  await supabase.from('project_milestones').delete().eq('id', milestoneId);

  if (milestone) revalidatePath(`/projects/${milestone.project_id}`, 'layout');
}

export async function addDeliverableAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = deliverableSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { count } = await supabase
    .from('project_deliverables')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { error } = await supabase.from('project_deliverables').insert({
    project_id: projectId,
    title: input.title,
    description: input.description ?? null,
    owner_side: input.ownerSide,
    due_date: input.dueDate ?? null,
    position: (count ?? 0) + 1,
    created_by: session.userId,
  });

  if (error) return errorState(`Could not add the deliverable: ${error.message}`);

  revalidatePath(`/projects/${projectId}/planning`);
  return successState('Deliverable added.');
}

export async function toggleDeliverableAction(
  deliverableId: string,
  complete: boolean,
): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('project_deliverables')
    .select('project_id')
    .eq('id', deliverableId)
    .maybeSingle();

  await supabase
    .from('project_deliverables')
    .update({
      is_complete: complete,
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq('id', deliverableId);

  if (row) revalidatePath(`/projects/${row.project_id}/planning`);
}

export async function deleteDeliverableAction(deliverableId: string): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('project_deliverables')
    .select('project_id')
    .eq('id', deliverableId)
    .maybeSingle();

  await supabase.from('project_deliverables').delete().eq('id', deliverableId);

  if (row) revalidatePath(`/projects/${row.project_id}/planning`);
}

export async function addRiskAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = riskSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from('project_risks').insert({
    project_id: projectId,
    title: input.title,
    description: input.description ?? null,
    likelihood: input.likelihood,
    impact: input.impact,
    mitigation: input.mitigation ?? null,
    owner_id: input.ownerId ?? null,
    created_by: session.userId,
  });

  if (error) return errorState(`Could not add the risk: ${error.message}`);

  revalidatePath(`/projects/${projectId}/planning`);
  return successState('Risk recorded.');
}

export async function setRiskStatusAction(riskId: string, status: string): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('project_risks')
    .select('project_id')
    .eq('id', riskId)
    .maybeSingle();

  await supabase.from('project_risks').update({ status }).eq('id', riskId);

  if (row) revalidatePath(`/projects/${row.project_id}/planning`);
}

export async function deleteRiskAction(riskId: string): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('project_risks')
    .select('project_id')
    .eq('id', riskId)
    .maybeSingle();

  await supabase.from('project_risks').delete().eq('id', riskId);

  if (row) revalidatePath(`/projects/${row.project_id}/planning`);
}
