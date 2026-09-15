import type { Metadata } from 'next';

import { TaskList, type TaskRow } from '@/components/tasks/task-list';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { TaskFilters } from '@/components/tasks/task-filters';
import { requireAgency } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Tasks' };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAgency();
  const params = await searchParams;

  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const responsibility = one('responsibility');
  const overdueOnly = one('overdue') === '1';
  const mineOnly = one('mine') === '1';
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  let query = supabase
    .from('tasks')
    .select(
      `id, title, description, status, priority, responsibility, due_date, work_stream, project_id,
       assignee:users!tasks_assignee_id_fkey ( full_name ),
       project:projects!inner ( id, name )`,
    )
    .is('deleted_at', null)
    .neq('status', 'complete')
    .order('due_date', { nullsFirst: false })
    .limit(200);

  if (responsibility === 'client' || responsibility === 'agency') {
    query = query.eq('responsibility', responsibility);
  }
  if (overdueOnly) query = query.lt('due_date', today);
  if (mineOnly) query = query.eq('assignee_id', session.userId);

  const { data: tasks } = await query;
  const rows = (tasks ?? []) as unknown as TaskRow[];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Open work across every project you can see."
      />

      <TaskFilters />

      <Card>
        <CardHeader title="Open tasks" description={`${rows.length} outstanding`} />
        <TaskList
          tasks={rows}
          canEdit={false}
          showProject
          emptyMessage="Nothing matches these filters."
        />
      </Card>
    </>
  );
}
