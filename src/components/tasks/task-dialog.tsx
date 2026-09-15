'use client';

import { Plus, X } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormMessage, SubmitButton } from '@/components/ui/form-status';
import { createTaskAction, updateTaskAction } from '@/lib/actions/tasks';
import { idleState } from '@/lib/actions/types';
import {
  PRIORITY_LABELS,
  RESPONSIBILITY_LABELS,
  TASK_STATUS_LABELS,
  WORK_STREAM_LABELS,
  toOptions,
} from '@/lib/constants';
import type { TaskRow } from './task-list';

export interface TaskDialogProps {
  projectId: string;
  staff: { id: string; full_name: string }[];
  milestones: { id: string; title: string }[];
  task?: TaskRow | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Create/edit dialog. A plain focus-trapped panel rather than a dependency:
 * Escape closes it, focus moves into it on open, and the backdrop is a real
 * button so it is reachable without a mouse.
 */
export function TaskDialog({ projectId, staff, milestones, task, open, onClose }: TaskDialogProps) {
  const action = task ? updateTaskAction.bind(null, task.id) : createTaskAction;
  const [state, formAction] = useActionState(action, idleState);
  const [responsibility, setResponsibility] = useState(task?.responsibility ?? 'agency');

  useEffect(() => {
    setResponsibility(task?.responsibility ?? 'agency');
  }, [task]);

  useEffect(() => {
    if (state.status === 'success') onClose();
  }, [state.status, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const e = state.errors ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close dialog"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[var(--surface-card)] shadow-[var(--shadow-overlay)] sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-3.5">
          <h2 id="task-dialog-title" className="text-[15px] font-semibold">
            {task ? 'Edit task' : 'New task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form action={formAction} className="space-y-4 p-5" noValidate>
          <input type="hidden" name="projectId" value={projectId} />
          <FormMessage state={state} />

          <Field label="Title" error={e.title} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="title"
                required
                autoFocus
                defaultValue={task?.title ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>

          <Field label="Description" error={e.description}>
            {({ id }) => (
              <Textarea id={id} name="description" rows={3} defaultValue={task?.description ?? ''} />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsibility" error={e.responsibility}>
              {({ id }) => (
                <Select
                  id={id}
                  name="responsibility"
                  value={responsibility}
                  onChange={(ev) => setResponsibility(ev.target.value as 'agency' | 'client')}
                  options={toOptions(RESPONSIBILITY_LABELS)}
                />
              )}
            </Field>

            <Field label="Assigned to" error={e.assigneeId}>
              {({ id }) => (
                <Select
                  id={id}
                  name="assigneeId"
                  defaultValue={task ? undefined : ''}
                  placeholder="Unassigned"
                  disabled={responsibility === 'client'}
                  options={staff.map((s) => ({ value: s.id, label: s.full_name || 'Unnamed' }))}
                />
              )}
            </Field>

            <Field label="Due date" error={e.dueDate}>
              {({ id }) => (
                <Input id={id} name="dueDate" type="date" defaultValue={task?.due_date ?? ''} />
              )}
            </Field>

            <Field label="Priority" error={e.priority}>
              {({ id }) => (
                <Select
                  id={id}
                  name="priority"
                  defaultValue={task?.priority ?? 'medium'}
                  options={toOptions(PRIORITY_LABELS)}
                />
              )}
            </Field>

            <Field label="Status" error={e.status}>
              {({ id }) => (
                <Select
                  id={id}
                  name="status"
                  defaultValue={task?.status ?? 'to_do'}
                  options={toOptions(TASK_STATUS_LABELS)}
                />
              )}
            </Field>

            <Field
              label="Work stream"
              error={e.workStream}
              hint="Drives the design, development and QA progress figures."
            >
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  name="workStream"
                  defaultValue={task?.work_stream ?? ''}
                  placeholder="None"
                  aria-describedby={describedBy}
                  options={Object.entries(WORK_STREAM_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              )}
            </Field>
          </div>

          {milestones.length > 0 ? (
            <Field label="Linked milestone" error={e.milestoneId}>
              {({ id }) => (
                <Select
                  id={id}
                  name="milestoneId"
                  placeholder="None"
                  options={milestones.map((m) => ({ value: m.id, label: m.title }))}
                />
              )}
            </Field>
          ) : null}

          {responsibility === 'agency' ? (
            <Checkbox
              name="isClientVisible"
              defaultChecked={task?.responsibility === 'agency' ? undefined : true}
              label="Visible to the client"
              description="Client-responsibility tasks are always visible."
            />
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">{task ? 'Save task' : 'Create task'}</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      New task
    </Button>
  );
}
