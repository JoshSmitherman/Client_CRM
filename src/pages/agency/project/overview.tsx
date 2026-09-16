import {
  CheckCircle2,
  FileText,
  FolderOpen,
  LifeBuoy,
  ListTodo,
  MessageSquare,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { MilestoneTimeline } from '@/components/projects/milestone-timeline';
import { ProgressBreakdown } from '@/components/projects/progress-breakdown';
import { QueryBoundary } from '@/components/routing/page-state';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Timeline } from '@/components/ui/timeline';
import {
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  FILE_APPROVAL_LABELS,
  FILE_APPROVAL_TONES,
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUS_TONES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
  URGENCY_LABELS,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import {
  formatCurrency,
  formatDate,
  formatFileSize,
  formatRelative,
  isOverdue,
} from '@/lib/format';
import { getProjectOverview, getProjectProgress } from '@/lib/queries/projects';
import { truncate } from '@/lib/utils';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

export function ProjectOverviewTab() {
  const { projectId, project } = useProjectWorkspace();
  const query = useQuery(
    () => Promise.all([getProjectOverview(projectId), getProjectProgress(projectId)]),
    [projectId],
  );

  const base = `/projects/${projectId}`;

  return (
    <QueryBoundary query={query}>
      {([overview, progress]) => (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* ---------------- Main column ---------------- */}
          <div className="space-y-4 lg:col-span-2">
            {project.description ? (
              <Card>
                <CardHeader title="About this project" />
                <CardBody>
                  <p className="text-[13px] whitespace-pre-wrap text-[var(--text-secondary)]">
                    {project.description}
                  </p>
                </CardBody>
              </Card>
            ) : null}

            {/* Outstanding actions, split by who owes them. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader
                  title="Outstanding client actions"
                  description={
                    overview.overdueClientActions > 0
                      ? `${overview.overdueClientActions} overdue`
                      : undefined
                  }
                  action={
                    <Link
                      to={`${base}/tasks`}
                      className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      All tasks
                    </Link>
                  }
                />
                {overview.clientActions.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Nothing outstanding"
                    description="The client has no open actions."
                  />
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {overview.clientActions.map((task) => (
                      <li key={task.id} className="flex items-start gap-2 px-5 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {task.title}
                          </span>
                          <span
                            className={
                              isOverdue(task.due_date)
                                ? 'text-[12px] font-medium text-[var(--danger-text)]'
                                : 'text-[12px] text-[var(--text-muted)]'
                            }
                          >
                            {task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date'}
                          </span>
                        </span>
                        <Badge tone={PRIORITY_TONES[task.priority]}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Outstanding agency actions"
                  action={
                    <Link
                      to={`${base}/tasks`}
                      className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      All tasks
                    </Link>
                  }
                />
                {overview.agencyActions.length === 0 ? (
                  <EmptyState
                    icon={ListTodo}
                    title="Nothing outstanding"
                    description="No open agency tasks."
                  />
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {overview.agencyActions.map((task) => {
                      const assignee = task.users as unknown as { full_name: string } | null;
                      return (
                        <li key={task.id} className="flex items-start gap-2 px-5 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">
                              {task.title}
                            </span>
                            <span
                              className={
                                isOverdue(task.due_date)
                                  ? 'text-[12px] font-medium text-[var(--danger-text)]'
                                  : 'text-[12px] text-[var(--text-muted)]'
                              }
                            >
                              {task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date'}
                              {assignee ? ` · ${assignee.full_name}` : ''}
                            </span>
                          </span>
                          <Badge tone={PRIORITY_TONES[task.priority]}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>

            {/* Requests */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader
                  title="Open change requests"
                  action={
                    <Link
                      to={`${base}/changes`}
                      className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      View all
                    </Link>
                  }
                />
                {overview.changeRequests.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="None open"
                    description="Nothing outstanding."
                  />
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {overview.changeRequests.map((cr) => (
                      <li key={cr.id}>
                        <Link
                          to={`/change-requests/${cr.id}`}
                          className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <span className="block truncate text-[13px] font-medium">{cr.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone={CHANGE_STATUS_TONES[cr.status]}>
                              {CHANGE_STATUS_LABELS[cr.status]}
                            </Badge>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              {cr.reference}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Open support requests"
                  action={
                    <Link
                      to={`${base}/support`}
                      className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      View all
                    </Link>
                  }
                />
                {overview.supportRequests.length === 0 ? (
                  <EmptyState icon={LifeBuoy} title="None open" description="No active tickets." />
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {overview.supportRequests.map((sr) => (
                      <li key={sr.id}>
                        <Link
                          to={`/support/${sr.id}`}
                          className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <span className="block truncate text-[13px] font-medium">
                            {sr.subject}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone={SUPPORT_STATUS_TONES[sr.status]}>
                              {SUPPORT_STATUS_LABELS[sr.status]}
                            </Badge>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {URGENCY_LABELS[sr.urgency]}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Recent comments */}
            <Card>
              <CardHeader
                title="Recent comments"
                action={
                  <Link
                    to={`${base}/comments`}
                    className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              {overview.comments.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No comments yet"
                  description="Start a conversation on the Comments tab."
                />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {overview.comments.map((comment) => {
                    const author = comment.users as unknown as { full_name: string } | null;
                    return (
                      <li key={comment.id} className="flex gap-3 px-5 py-3">
                        <Avatar name={author?.full_name ?? 'Unknown'} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="font-medium text-[var(--text-primary)]">
                              {author?.full_name ?? 'Unknown'}
                            </span>
                            <span className="text-[var(--text-muted)]">
                              {formatRelative(comment.created_at)}
                            </span>
                            {comment.is_internal ? <Badge tone="warning">Internal</Badge> : null}
                          </p>
                          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
                            {truncate(comment.body, 160)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <div className="space-y-4">
            <ProgressBreakdown progress={progress} overall={project.completion_percentage} />

            <Card>
              <CardHeader
                title="Milestones"
                action={
                  <Link
                    to={`${base}/planning`}
                    className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Edit
                  </Link>
                }
              />
              <CardBody>
                <MilestoneTimeline milestones={overview.milestones} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Maintenance"
                action={
                  <Link
                    to={`${base}/maintenance`}
                    className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Manage
                  </Link>
                }
              />
              {overview.subscription ? (
                <CardBody className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">
                      {(
                        overview.subscription.maintenance_plans as unknown as {
                          name: string;
                        } | null
                      )?.name ?? 'Plan'}
                    </span>
                    <Badge tone={SUBSCRIPTION_STATUS_TONES[overview.subscription.status]} dot>
                      {SUBSCRIPTION_STATUS_LABELS[overview.subscription.status]}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {formatCurrency(
                      overview.subscription.price,
                      overview.subscription.currency,
                    )}{' '}
                    · renews {formatDate(overview.subscription.renewal_date)}
                  </p>
                </CardBody>
              ) : (
                <EmptyState
                  icon={ShieldCheck}
                  title="No subscription"
                  description="This project has no maintenance plan."
                  action={
                    <Button variant="secondary" size="sm" asChild>
                      <Link to={`${base}/maintenance`}>Set one up</Link>
                    </Button>
                  }
                />
              )}
            </Card>

            <Card>
              <CardHeader
                title="Handover"
                action={
                  <Link
                    to={`${base}/handover`}
                    className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Open
                  </Link>
                }
              />
              {overview.handover ? (
                <CardBody className="space-y-1">
                  <Badge tone={HANDOVER_STATUS_TONES[overview.handover.status]} dot>
                    {HANDOVER_STATUS_LABELS[overview.handover.status]}
                  </Badge>
                  {overview.handover.website_url ? (
                    <p className="truncate text-[12px] text-[var(--text-muted)]">
                      {overview.handover.website_url.replace(/^https?:\/\//, '')}
                    </p>
                  ) : null}
                </CardBody>
              ) : (
                <EmptyState
                  icon={Rocket}
                  title="Not started"
                  description="Prepare the handover as launch approaches."
                />
              )}
            </Card>

            <Card>
              <CardHeader
                title="Latest files"
                action={
                  <Link
                    to={`${base}/files`}
                    className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              {overview.files.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No files yet"
                  description="Nothing uploaded."
                />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {overview.files.map((file) => (
                    <li key={file.id} className="px-5 py-2.5">
                      <p className="truncate text-[13px]">{file.file_name}</p>
                      <p className="mt-0.5 flex items-center gap-2">
                        <Badge tone={FILE_APPROVAL_TONES[file.approval_status]}>
                          {FILE_APPROVAL_LABELS[file.approval_status]}
                        </Badge>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {formatFileSize(file.size_bytes)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Recent activity"
                action={
                  <Link
                    to={`${base}/activity`}
                    className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              <CardBody>
                {overview.activity.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-muted)]">Nothing recorded yet.</p>
                ) : (
                  <Timeline
                    entries={overview.activity.map((entry) => ({
                      id: entry.id,
                      title: entry.summary,
                      meta: entry.actor_name ?? undefined,
                      timestamp: entry.created_at,
                      tone: entry.visibility === 'client' ? 'accent' : 'neutral',
                    }))}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}
