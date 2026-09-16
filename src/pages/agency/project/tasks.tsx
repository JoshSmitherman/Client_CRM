import { QueryBoundary } from '@/components/routing/page-state';
import { TaskBoard } from '@/components/tasks/task-board';
import type { TaskRow } from '@/components/tasks/task-list';
import { useQuery } from '@/lib/data/use-query';
import { getAgencyStaff } from '@/lib/queries/projects';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

async function load(projectId: string) {
  const [{ data: tasks }, staff, { data: milestones }] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `id, title, description, status, priority, responsibility, due_date, work_stream, project_id,
         assignee:users!tasks_assignee_id_fkey ( full_name )`,
      )
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('status')
      .order('due_date', { nullsFirst: false })
      .order('priority', { ascending: false }),
    getAgencyStaff(),
    supabase.from('project_milestones').select('id, title').eq('project_id', projectId).order('position'),
  ]);

  return { tasks, staff, milestones };
}

export function ProjectTasksTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => load(projectId), [projectId]);

  return (
    <QueryBoundary query={query}>
      {({ tasks, staff, milestones }) => (
        <TaskBoard
          projectId={projectId}
          tasks={(tasks ?? []) as unknown as TaskRow[]}
          staff={staff}
          milestones={milestones ?? []}
          canEdit
        />
      )}
    </QueryBoundary>
  );
}
