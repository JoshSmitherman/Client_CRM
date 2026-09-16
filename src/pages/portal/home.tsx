import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderOpen,
  LifeBuoy,
  MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { AllowanceMeter } from '@/components/maintenance/allowance-meter';
import { QuickActions } from '@/components/portal/quick-actions';
import { QueryBoundary } from '@/components/routing/page-state';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress';
import { Timeline } from '@/components/ui/timeline';
import { useProfile } from '@/lib/auth-context';
import {
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  FILE_APPROVAL_LABELS,
  FILE_APPROVAL_TONES,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatDate, formatRelative, isOverdue } from '@/lib/format';
import { getAllowance } from '@/lib/queries/maintenance';
import { getPortalDeadlines, getPortalHome } from '@/lib/queries/portal';
import { useDocumentTitle } from '@/lib/use-document-title';
import { truncate } from '@/lib/utils';

async function load() {
  const [home, deadlines] = await Promise.all([getPortalHome(), getPortalDeadlines()]);

  const allowance = home.subscription
    ? await getAllowance(home.subscription.id, {
        change: home.subscription.included_change_minutes,
        support: home.subscription.included_support_minutes,
      })
    : null;

  return { home, deadlines, allowance };
}

export function PortalHomePage() {
  useDocumentTitle('Home');
  const profile = useProfile();
  const query = useQuery(load, []);

  const firstName = profile.full_name?.split(' ')[0] ?? 'there';

  return (
    <QueryBoundary query={query}>
      {({ home, deadlines, allowance }) => {
        const plan = home.subscription?.maintenance_plans as unknown as { name: string } | null;

        return (
          <>
            <header className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {home.outstandingActions.length > 0
                  ? `You have ${home.outstandingActions.length} thing${home.outstandingActions.length === 1 ? '' : 's'} to look at${home.overdueActions > 0 ? `, ${home.overdueActions} of them overdue` : ''}.`
                  : 'Everything is up to date — there is nothing waiting on you.'}
              </p>
            </header>

            <section aria-label="Quick actions" className="mb-6">
              <QuickActions
                onboardingProjectId={home.onboardingProjectId}
                firstProjectId={home.projects[0]?.id ?? null}
              />
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {/* Projects */}
                <Card>
                  <CardHeader title="Your projects" />
                  {home.projects.length === 0 ? (
                    <EmptyState
                      title="No active projects"
                      description="When we start work, your project will appear here."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {home.projects.map((project) => {
                        const stage = project.lifecycle_stages as unknown as
                          | { label: string; colour: string }
                          | null;
                        return (
                          <li key={project.id}>
                            <Link
                              to={`/portal/projects/${project.id}`}
                              className="block px-5 py-4 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-[15px] font-medium">{project.name}</span>
                                {stage ? (
                                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: stage.colour }}
                                      aria-hidden="true"
                                    />
                                    {stage.label}
                                  </span>
                                ) : null}
                              </div>

                              <ProgressBar
                                className="mt-2"
                                value={project.completion_percentage}
                                label="Progress"
                              />

                              {project.target_launch_date ? (
                                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                                  Planned launch {formatDate(project.target_launch_date)}
                                </p>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                {/* Outstanding actions */}
                <Card>
                  <CardHeader
                    title="Things we need from you"
                    description={
                      home.overdueActions > 0 ? `${home.overdueActions} overdue` : undefined
                    }
                  />
                  {home.outstandingActions.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle2}
                      title="Nothing outstanding"
                      description="We have everything we need from you at the moment."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {home.outstandingActions.map((task) => {
                        const project = task.projects as unknown as {
                          id: string;
                          name: string;
                        } | null;
                        const late = isOverdue(task.due_date);

                        return (
                          <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                            {late ? (
                              <AlertCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]"
                                aria-hidden="true"
                              />
                            ) : (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--warning)]" />
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium">{task.title}</p>
                              <p
                                className={
                                  late
                                    ? 'text-[12px] font-medium text-[var(--danger-text)]'
                                    : 'text-[12px] text-[var(--text-muted)]'
                                }
                              >
                                {task.due_date
                                  ? `${late ? 'Overdue — was due' : 'Due'} ${formatDate(task.due_date)}`
                                  : 'No date set'}
                                {project ? ` · ${project.name}` : ''}
                              </p>
                            </div>

                            {project ? (
                              <Link
                                to={`/portal/projects/${project.id}`}
                                className="shrink-0 text-[12px] font-medium text-[var(--accent-text)] hover:underline"
                              >
                                Open
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                {/* Requests */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader
                      title="Change requests"
                      action={
                        <Link
                          to="/portal/requests"
                          className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                        >
                          All
                        </Link>
                      }
                    />
                    {home.changeRequests.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="None open"
                        description="Nothing in progress."
                      />
                    ) : (
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {home.changeRequests.map((cr) => (
                          <li key={cr.id}>
                            <Link
                              to={`/portal/requests/${cr.id}`}
                              className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block truncate text-[13px] font-medium">
                                {cr.title}
                              </span>
                              <span className="mt-1 block">
                                <Badge tone={CHANGE_STATUS_TONES[cr.status]}>
                                  {CHANGE_STATUS_LABELS[cr.status]}
                                </Badge>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card>
                    <CardHeader
                      title="Support"
                      action={
                        <Link
                          to="/portal/support"
                          className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                        >
                          All
                        </Link>
                      }
                    />
                    {home.supportRequests.length === 0 ? (
                      <EmptyState
                        icon={LifeBuoy}
                        title="None open"
                        description="No active tickets."
                      />
                    ) : (
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {home.supportRequests.map((sr) => (
                          <li key={sr.id}>
                            <Link
                              to={`/portal/support/${sr.id}`}
                              className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block truncate text-[13px] font-medium">
                                {sr.subject}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge tone={SUPPORT_STATUS_TONES[sr.status]}>
                                  {SUPPORT_STATUS_LABELS[sr.status]}
                                </Badge>
                                {sr.covered_by_plan === true ? (
                                  <Badge tone="success">Covered</Badge>
                                ) : null}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {home.subscription && allowance ? (
                  <Card>
                    <CardHeader
                      title="Your maintenance plan"
                      action={
                        <Link
                          to="/portal/maintenance"
                          className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                        >
                          Details
                        </Link>
                      }
                    />
                    <CardBody className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium">{plan?.name ?? 'Plan'}</span>
                        <Badge tone={SUBSCRIPTION_STATUS_TONES[home.subscription.status]} dot>
                          {SUBSCRIPTION_STATUS_LABELS[home.subscription.status]}
                        </Badge>
                      </div>
                      <p className="text-[12px] text-[var(--text-muted)]">
                        Renews {formatDate(home.subscription.renewal_date)}
                      </p>
                      <AllowanceMeter allowance={allowance} />
                    </CardBody>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader title="Upcoming dates" />
                  {deadlines.length === 0 ? (
                    <EmptyState
                      icon={CalendarClock}
                      title="Nothing scheduled"
                      description="Key dates will appear here."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {deadlines.map((milestone) => {
                        const project = milestone.projects as unknown as { name: string } | null;
                        return (
                          <li key={milestone.id} className="px-5 py-3">
                            <p className="text-[13px] font-medium">{milestone.title}</p>
                            <p className="text-[12px] text-[var(--text-muted)]">
                              {formatDate(milestone.target_date)}
                              {project ? ` · ${project.name}` : ''}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                <Card>
                  <CardHeader
                    title="Recent messages"
                    action={
                      <Link
                        to="/portal/messages"
                        className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                      >
                        All
                      </Link>
                    }
                  />
                  {home.recentComments.length === 0 ? (
                    <EmptyState
                      icon={MessageSquare}
                      title="No messages"
                      description="Conversations with us appear here."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {home.recentComments.map((comment) => {
                        const author = comment.users as unknown as { full_name: string } | null;
                        return (
                          <li key={comment.id} className="flex gap-3 px-5 py-3">
                            <Avatar name={author?.full_name ?? 'Unknown'} size="sm" />
                            <div className="min-w-0">
                              <p className="text-[12px]">
                                <span className="font-medium">
                                  {author?.full_name ?? 'Unknown'}
                                </span>
                                <span className="text-[var(--text-muted)]">
                                  {' '}
                                  {formatRelative(comment.created_at)}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
                                {truncate(comment.body, 120)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                <Card>
                  <CardHeader
                    title="Recent files"
                    action={
                      <Link
                        to="/portal/files"
                        className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                      >
                        All
                      </Link>
                    }
                  />
                  {home.recentFiles.length === 0 ? (
                    <EmptyState
                      icon={FolderOpen}
                      title="No files yet"
                      description="Nothing uploaded."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {home.recentFiles.map((file) => (
                        <li key={file.id} className="px-5 py-2.5">
                          <p className="truncate text-[13px]">{file.file_name}</p>
                          <p className="mt-0.5">
                            <Badge tone={FILE_APPROVAL_TONES[file.approval_status]}>
                              {FILE_APPROVAL_LABELS[file.approval_status]}
                            </Badge>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Recent activity" />
                  <CardBody>
                    {home.activity.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-muted)]">Nothing yet.</p>
                    ) : (
                      <Timeline
                        entries={home.activity.map((entry) => ({
                          id: entry.id,
                          title: entry.summary,
                          meta: entry.actor_name ?? undefined,
                          timestamp: entry.created_at,
                          tone: 'accent' as const,
                        }))}
                      />
                    )}
                  </CardBody>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </QueryBoundary>
  );
}
