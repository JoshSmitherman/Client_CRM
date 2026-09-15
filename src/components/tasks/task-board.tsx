'use client';

import { useState } from 'react';

import { Card, CardHeader } from '@/components/ui/card';
import { NewTaskButton, TaskDialog } from './task-dialog';
import { TaskList, type TaskRow } from './task-list';

/**
 * Owns the dialog state so the server component that loads tasks can stay a
 * server component.
 */
export function TaskBoard({
  projectId,
  tasks,
  staff,
  milestones,
  canEdit,
}: {
  projectId: string;
  tasks: TaskRow[];
  staff: { id: string; full_name: string }[];
  milestones: { id: string; title: string }[];
  canEdit: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: TaskRow) {
    setEditing(task);
    setDialogOpen(true);
  }

  const open = tasks.filter((t) => t.status !== 'complete');
  const done = tasks.filter((t) => t.status === 'complete');

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Open tasks"
            description={`${open.length} outstanding`}
            action={canEdit ? <NewTaskButton onClick={openNew} /> : null}
          />
          <TaskList
            tasks={open}
            canEdit={canEdit}
            onEdit={canEdit ? openEdit : undefined}
            emptyMessage="Nothing outstanding on this project."
          />
        </Card>

        {done.length > 0 ? (
          <Card>
            <CardHeader title="Completed" description={`${done.length} done`} />
            <TaskList tasks={done} canEdit={canEdit} onEdit={canEdit ? openEdit : undefined} />
          </Card>
        ) : null}
      </div>

      {canEdit ? (
        <TaskDialog
          projectId={projectId}
          staff={staff}
          milestones={milestones}
          task={editing}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </>
  );
}
