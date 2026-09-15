'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { recordActivity } from '@/lib/activity';
import { AuditAction, recordAudit } from '@/lib/audit';
import { requireAgency } from '@/lib/auth';
import { ONBOARDING_SECTIONS } from '@/lib/onboarding-template';
import { createClient } from '@/lib/supabase/server';
import { formObject } from '@/lib/validation/common';
import { projectSchema, projectSettingsSchema } from '@/lib/validation/projects';
import { errorState, successState, zodErrors, type ActionState } from './types';

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = projectSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  // Default to the first lifecycle stage if none was chosen.
  let stageId = input.stageId ?? null;
  if (!stageId) {
    const { data: firstStage } = await supabase
      .from('lifecycle_stages')
      .select('id')
      .eq('is_active', true)
      .order('position')
      .limit(1)
      .maybeSingle();
    stageId = firstStage?.id ?? null;
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      client_id: input.clientId,
      name: input.name,
      project_type: input.projectType,
      description: input.description ?? null,
      stage_id: stageId,
      target_start_date: input.targetStartDate ?? null,
      target_launch_date: input.targetLaunchDate ?? null,
      internal_notes: input.internalNotes ?? null,
      created_by: session.userId,
    })
    .select('id, name, reference, client_id')
    .single();

  if (error || !project) {
    return errorState(`Could not create the project: ${error?.message ?? 'unknown error'}`);
  }

  // The creator is a member so they retain access even if they are not a
  // manager; and every project gets a plan row so the Planning tab is editable
  // immediately rather than needing a "create plan" step.
  await Promise.all([
    supabase.from('project_members').insert({
      project_id: project.id,
      user_id: session.userId,
      project_role: 'lead',
      can_edit: true,
      added_by: session.userId,
    }),
    supabase.from('project_plans').insert({ project_id: project.id, updated_by: session.userId }),
  ]);

  if (input.createOnboarding) {
    await supabase.from('onboarding_sections').insert(
      ONBOARDING_SECTIONS.map((section, index) => ({
        project_id: project.id,
        key: section.key,
        title: section.title,
        description: section.description,
        position: index + 1,
        status: 'not_started' as const,
      })),
    );
  }

  await Promise.all([
    recordAudit({
      action: AuditAction.ProjectCreated,
      entityType: 'project',
      entityId: project.id,
      newValue: { name: project.name, reference: project.reference },
    }),
    recordActivity({
      projectId: project.id,
      clientId: project.client_id,
      action: AuditAction.ProjectCreated,
      summary: `Project ${project.name} was created`,
      entityType: 'project',
      entityId: project.id,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
  ]);

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect(`/projects/${project.id}`);
}

export async function updateProjectSettingsAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAgency();

  const parsed = projectSettingsSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('projects')
    .select('name, stage_id, health, client_id, lifecycle_stages ( label )')
    .eq('id', projectId)
    .maybeSingle();

  if (!before) return errorState('That project could not be found.');

  const { error } = await supabase
    .from('projects')
    .update({
      name: input.name,
      project_type: input.projectType,
      description: input.description ?? null,
      stage_id: input.stageId ?? null,
      health: input.health,
      target_start_date: input.targetStartDate ?? null,
      target_launch_date: input.targetLaunchDate ?? null,
      actual_launch_date: input.actualLaunchDate ?? null,
      internal_notes: input.internalNotes ?? null,
    })
    .eq('id', projectId);

  if (error) return errorState(`Could not save the project: ${error.message}`);

  // A stage change is the single most meaningful project event, so it gets its
  // own audit action and a client-visible activity entry.
  if (before.stage_id !== (input.stageId ?? null)) {
    const { data: newStage } = await supabase
      .from('lifecycle_stages')
      .select('label')
      .eq('id', input.stageId ?? '')
      .maybeSingle();

    const previousLabel = (before.lifecycle_stages as unknown as { label: string } | null)?.label;

    await Promise.all([
      recordAudit({
        action: AuditAction.ProjectStageChanged,
        entityType: 'project',
        entityId: projectId,
        previousValue: { stage: previousLabel ?? null },
        newValue: { stage: newStage?.label ?? null },
      }),
      recordActivity({
        projectId,
        clientId: before.client_id,
        action: AuditAction.ProjectStageChanged,
        summary: `Project moved to ${newStage?.label ?? 'a new stage'}`,
        entityType: 'project',
        entityId: projectId,
        visibility: 'client',
        actorName: session.profile.full_name,
      }),
    ]);
  } else {
    await recordAudit({
      action: AuditAction.ProjectUpdated,
      entityType: 'project',
      entityId: projectId,
      previousValue: { name: before.name, health: before.health },
      newValue: { name: input.name, health: input.health },
    });
  }

  revalidatePath(`/projects/${projectId}`, 'layout');
  return successState('Project settings saved.');
}

/** Moves a project to a stage directly from the workspace header. */
export async function setProjectStageAction(
  projectId: string,
  stageId: string,
): Promise<void> {
  const session = await requireAgency();
  const supabase = await createClient();

  const [{ data: before }, { data: stage }] = await Promise.all([
    supabase
      .from('projects')
      .select('client_id, stage_id, lifecycle_stages ( label )')
      .eq('id', projectId)
      .maybeSingle(),
    supabase.from('lifecycle_stages').select('label').eq('id', stageId).maybeSingle(),
  ]);

  if (!before || !stage) throw new Error('Project or stage not found.');
  if (before.stage_id === stageId) return;

  const { error } = await supabase
    .from('projects')
    .update({ stage_id: stageId })
    .eq('id', projectId);

  if (error) throw new Error(error.message);

  await Promise.all([
    recordAudit({
      action: AuditAction.ProjectStageChanged,
      entityType: 'project',
      entityId: projectId,
      previousValue: {
        stage: (before.lifecycle_stages as unknown as { label: string } | null)?.label ?? null,
      },
      newValue: { stage: stage.label },
    }),
    recordActivity({
      projectId,
      clientId: before.client_id,
      action: AuditAction.ProjectStageChanged,
      summary: `Project moved to ${stage.label}`,
      entityType: 'project',
      entityId: projectId,
      visibility: 'client',
      actorName: session.profile.full_name,
    }),
  ]);

  revalidatePath(`/projects/${projectId}`, 'layout');
}

export async function addProjectMemberAction(
  projectId: string,
  formData: FormData,
): Promise<void> {
  await requireAgency();

  const userId = String(formData.get('userId') ?? '');
  const projectRole = String(formData.get('projectRole') ?? 'contributor');
  const canEdit = formData.get('canEdit') === 'on';

  if (!userId) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from('project_members')
    .upsert(
      { project_id: projectId, user_id: userId, project_role: projectRole, can_edit: canEdit },
      { onConflict: 'project_id,user_id' },
    );

  if (error) throw new Error(error.message);

  await recordAudit({
    action: AuditAction.PermissionsChanged,
    entityType: 'project',
    entityId: projectId,
    newValue: { added_member: userId, can_edit: canEdit, project_role: projectRole },
  });

  revalidatePath(`/projects/${projectId}/settings`);
}

export async function removeProjectMemberAction(
  projectId: string,
  memberId: string,
): Promise<void> {
  await requireAgency();
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('id', memberId)
    .maybeSingle();

  await supabase.from('project_members').delete().eq('id', memberId);

  await recordAudit({
    action: AuditAction.PermissionsChanged,
    entityType: 'project',
    entityId: projectId,
    previousValue: { removed_member: member?.user_id ?? null },
  });

  revalidatePath(`/projects/${projectId}/settings`);
}
