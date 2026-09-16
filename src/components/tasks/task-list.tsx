import { AlertCircle, ListTodo, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { deleteTaskAction, setTaskStatusAction } from '@/lib/actions/tasks';
import { revalidate } from '@/lib/data/revalidate';
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  WORK_STREAM_LABELS,
} from '@/lib/constants';
import { formatDate, isOverdue } from '@/lib/format';
import type { Enums } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: Enums<'task_status'>;
  priority: Enums<'task_priority'>;
  responsibility: Enums<'responsibility'>;
  due_date: string | null;
  work_stream: string | null;
  project_id: string;
  assignee?: { full_name: string } | null;
  project?: { id: string; name: string } | null;
}

export function TaskList({
  tasks,
  canEdit,
  onEdit,
  showProject = false,
  emptyMessage = 'No tasks match these filters.',
}: {
  tasks: TaskRow[];
  canEdit: boolean;
  onEdit?: (task: TaskRow) => void;
  showProject?: boolean;
  emptyMessage?: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState icon={ListTodo} title="No tasks" description={emptyMessage} />;
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          canEdit={canEdit}
          onEdit={onEdit}
          showProject={showProject}
        />
      ))}
    </ul>
  );
}

function TaskItem({
  task,
  canEdit,
  onEdit,
  showProject,
}: {
  task: TaskRow;
  canEdit: boolean;
  onEdit?: (task: TaskRow) => void;
  showProject: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const complete = task.status === 'complete';
  const overdue = isOverdue(task.due_date, complete);

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        await setTaskStatusAction(task.id, complete ? 'to_do' : 'complete');
        revalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the task.');
      }
    });
  }

  return (
    <li className={cn('flex items-start gap-3 px-5 py-3.5', isPending && 'opacity-60')}>
      <input
        type="checkbox"
        checked={complete}
        onChange={toggle}
        disabled={isPending}
        aria-label={complete ? `Reopen ${task.title}` : `Mark ${task.title} complete`}
        className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
      />

      <div className="min-w-0 flex-1">
        <p className={cn('text-[14px] font-medium', complete && 'text-[var(--text-muted)] line-through')}>
          {task.title}
        </p>

        {task.description ? (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--text-secondary)]">
            {task.description}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={TASK_STATUS_TONES[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
          <Badge tone={PRIORITY_TONES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
          <Badge tone={task.responsibility === 'client' ? 'accent' : 'neutral'}>
            {task.responsibility === 'client' ? 'Client' : 'Agency'}
          </Badge>
          {task.work_stream ? (
            <span className="text-[12px] text-[var(--text-muted)]">
              {WORK_STREAM_LABELS[task.work_stream] ?? task.work_stream}
            </span>
          ) : null}

          {task.due_date ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[12px]',
                overdue ? 'font-medium text-[var(--danger-text)]' : 'text-[var(--text-muted)]',
              )}
            >
              {overdue ? <AlertCircle className="h-3 w-3" aria-hidden="true" /> : null}
              {overdue ? 'Overdue — was due' : 'Due'} {formatDate(task.due_date)}
            </span>
          ) : null}

          {showProject && task.project ? (
            <Link
              to={`/projects/${task.project.id}/tasks`}
              className="text-[12px] text-[var(--accent-text)] hover:underline"
            >
              {task.project.name}
            </Link>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-1 text-[12px] text-[var(--danger-text)]">
            {error}
          </p>
        ) : null}
      </div>

      {task.assignee ? <Avatar name={task.assignee.full_name} size="xs" className="mt-0.5" /> : null}

      {canEdit ? (
        <div className="flex shrink-0 items-center">
          {onEdit ? (
            <Button variant="ghost" size="icon" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : null}
          <form action={async () => { await deleteTaskAction(task.id); revalidate(); }}>
            <Button variant="ghost" size="icon" type="submit" aria-label={`Delete ${task.title}`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
