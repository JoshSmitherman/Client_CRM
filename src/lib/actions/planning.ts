
import { recordActivity } from '@/lib/activity';
import { setInternalNote } from '@/lib/internal-notes';
import { requireAgencyUser } from '@/lib/session';
import { supabase } from '@/lib/supabase/client';
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
  const session = await requireAgencyUser();

  const parsed = planSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

  // Projects created before the plan row existed, or created outside the app,
  // still need one — upsert rather than assume.
  const { error } = await supabase.from('project_plans').upsert(
    {
      project_id: projectId,
      scope: input.scope ?? null,
      objectives: input.objectives ?? null,
      client_responsibilities: input.clientResponsibilities ?? null,
      agency_responsibilities: input.agencyResponsibilities ?? null,
      updated_by: session.userId,
    },
    { onConflict: 'project_id' },
  );

  if (error) return errorState(`Could not save the plan: ${error.message}`);

  const { data: plan } = await supabase
    .from('project_plans')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (plan) {
    await setInternalNote({
      entityType: 'project_plan',
      entityId: plan.id,
      projectId,
      body: input.notes,
      userId: session.userId,
    });
  }
  return successState('Plan saved.');
}

export async function addMilestoneAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgencyUser();

  const parsed = milestoneSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

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
  const session = await requireAgencyUser();

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
}

export async function deleteMilestoneAction(milestoneId: string): Promise<void> {
  await requireAgencyUser();

  await supabase.from('project_milestones').delete().eq('id', milestoneId);
}

export async function addDeliverableAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgencyUser();

  const parsed = deliverableSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

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
  return successState('Deliverable added.');
}

export async function toggleDeliverableAction(
  deliverableId: string,
  complete: boolean,
): Promise<void> {
  await requireAgencyUser();

  await supabase
    .from('project_deliverables')
    .update({
      is_complete: complete,
      completed_at: complete ? new Date().toISOString() : null,
    })
    .eq('id', deliverableId);
}

export async function deleteDeliverableAction(deliverableId: string): Promise<void> {
  await requireAgencyUser();

  await supabase.from('project_deliverables').delete().eq('id', deliverableId);
}

export async function addRiskAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgencyUser();

  const parsed = riskSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;

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
  return successState('Risk recorded.');
}

export async function setRiskStatusAction(riskId: string, status: string): Promise<void> {
  await requireAgencyUser();

  await supabase.from('project_risks').update({ status }).eq('id', riskId);
}

export async function deleteRiskAction(riskId: string): Promise<void> {
  await requireAgencyUser();

  await supabase.from('project_risks').delete().eq('id', riskId);
}
