import { notFound } from 'next/navigation';

import { TaskBoard } from '@/components/tasks/task-board';
import type { TaskRow } from '@/components/tasks/task-list';
import { requireAgency } from '@/lib/auth';
import { getAgencyStaff, getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export default async function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();

  const [{ data: tasks }, staff, { data: milestones }] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `id, title, description, status, priority, responsibility, due_date, work_stream, project_id,
         assignee:users!tasks_assignee_id_fkey ( full_name )`,
      )
      .eq('project_id', id)
      .is('deleted_at', null)
      .order('status')
      .order('due_date', { nullsFirst: false })
      .order('priority', { ascending: false }),
    getAgencyStaff(),
    supabase
      .from('project_milestones')
      .select('id, title')
      .eq('project_id', id)
      .order('position'),
  ]);

  return (
    <TaskBoard
      projectId={id}
      tasks={(tasks ?? []) as unknown as TaskRow[]}
      staff={staff}
      milestones={milestones ?? []}
      canEdit
    />
  );
}
