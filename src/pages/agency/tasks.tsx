import { useSearchParams } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { TaskFilters } from '@/components/tasks/task-filters';
import { TaskList, type TaskRow } from '@/components/tasks/task-list';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

interface Filters {
  responsibility?: string;
  overdueOnly: boolean;
  mineOnly: boolean;
  userId: string | null;
}

async function load({ responsibility, overdueOnly, mineOnly, userId }: Filters) {
  const today = new Date().toISOString().slice(0, 10);

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
  if (mineOnly && userId) query = query.eq('assignee_id', userId);

  const { data } = await query;
  return (data ?? []) as unknown as TaskRow[];
}

export function TasksPage() {
  useDocumentTitle('Tasks');
  const { userId } = useAuth();
  const [params] = useSearchParams();

  const responsibility = params.get('responsibility') ?? undefined;
  const overdueOnly = params.get('overdue') === '1';
  const mineOnly = params.get('mine') === '1';

  const query = useQuery(
    () => load({ responsibility, overdueOnly, mineOnly, userId }),
    [responsibility, overdueOnly, mineOnly, userId],
  );

  return (
    <>
      <PageHeader title="Tasks" description="Open work across every project you can see." />

      <TaskFilters />

      <QueryBoundary query={query}>
        {(rows) => (
          <Card>
            <CardHeader title="Open tasks" description={`${rows.length} outstanding`} />
            <TaskList
              tasks={rows}
              canEdit={false}
              showProject
              emptyMessage="Nothing matches these filters."
            />
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
