'use server';

import { revalidatePath } from 'next/cache';

import { recordActivity } from '@/lib/activity';
import { requireUser } from '@/lib/auth';
import { notify } from '@/lib/notifications';
import { isAgency } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { formObject } from '@/lib/validation/common';
import { taskSchema } from '@/lib/validation/tasks';
import type { Enums } from '@/lib/supabase/database.types';
import { errorState, successState, zodErrors, type ActionState } from './types';

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can create tasks.');
  }

  const parsed = taskSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description ?? null,
      assignee_id: input.assigneeId ?? null,
      responsibility: input.responsibility,
      due_date: input.dueDate ?? null,
      priority: input.priority,
      status: input.status,
      work_stream: input.workStream ?? null,
      onboarding_section_id: input.onboardingSectionId ?? null,
      milestone_id: input.milestoneId ?? null,
      // Client-responsibility tasks must be visible to the client, or they
      // could never act on them.
      is_client_visible: input.responsibility === 'client' ? true : input.isClientVisible,
      created_by: session.userId,
    })
    .select('id, title, project_id')
    .single();

  if (error || !task) {
    return errorState(`Could not create the task: ${error?.message ?? 'unknown error'}`);
  }

  if (input.assigneeId && input.assigneeId !== session.userId) {
    await notify({
      userIds: [input.assigneeId],
      type: 'task_assigned',
      title: 'You have been assigned a task',
      body: task.title,
      projectId: task.project_id,
      entityType: 'task',
      entityId: task.id,
      url: `/projects/${task.project_id}/tasks`,
    });
  }

  await recordActivity({
    projectId: task.project_id,
    action: 'task.created',
    summary: `Task "${task.title}" was created`,
    entityType: 'task',
    entityId: task.id,
    visibility: input.responsibility === 'client' ? 'client' : 'internal',
    actorName: session.profile.full_name,
  });

  revalidatePath(`/projects/${input.projectId}/tasks`);
  revalidatePath('/tasks');
  return successState('Task created.');
}

export async function updateTaskAction(
  taskId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) {
    return errorState('Only agency users can edit tasks.');
  }

  const parsed = taskSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description ?? null,
      assignee_id: input.assigneeId ?? null,
      responsibility: input.responsibility,
      due_date: input.dueDate ?? null,
      priority: input.priority,
      status: input.status,
      work_stream: input.workStream ?? null,
      milestone_id: input.milestoneId ?? null,
      is_client_visible: input.responsibility === 'client' ? true : input.isClientVisible,
    })
    .eq('id', taskId);

  if (error) return errorState(`Could not save the task: ${error.message}`);

  revalidatePath(`/projects/${input.projectId}/tasks`);
  revalidatePath('/tasks');
  return successState('Task saved.');
}

/**
 * Status-only change, used by the checkbox in task lists.
 *
 * Works for clients too: RLS lets them update a task on their own project that
 * is their responsibility, and the column guard trigger stops them touching
 * anything but the status.
 */
export async function setTaskStatusAction(
  taskId: string,
  status: Enums<'task_status'>,
): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('tasks')
    .select('title, status, project_id, responsibility')
    .eq('id', taskId)
    .maybeSingle();

  if (!before) throw new Error('Task not found.');

  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw new Error(error.message);

  if (status === 'complete' && before.status !== 'complete') {
    await recordActivity({
      projectId: before.project_id,
      action: 'task.completed',
      summary: `Task "${before.title}" was completed`,
      entityType: 'task',
      entityId: taskId,
      visibility: before.responsibility === 'client' ? 'client' : 'internal',
      actorName: session.profile.full_name,
    });
  }

  revalidatePath(`/projects/${before.project_id}/tasks`);
  revalidatePath('/tasks');
  revalidatePath('/portal', 'layout');
}

export async function deleteTaskAction(taskId: string): Promise<void> {
  const session = await requireUser();
  if (!isAgency(session.profile.role)) throw new Error('Only agency users can delete tasks.');

  const supabase = await createClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .maybeSingle();

  await supabase
    .from('tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', taskId);

  if (task) revalidatePath(`/projects/${task.project_id}/tasks`);
  revalidatePath('/tasks');
}
