import { AlertCircle, CheckCircle2, ClipboardList, FileText, Rocket, Upload } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { CommentThread } from '@/components/comments/comment-thread';
import { MilestoneTimeline } from '@/components/projects/milestone-timeline';
import { QueryBoundary } from '@/components/routing/page-state';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { Timeline } from '@/components/ui/timeline';
import { useAuth } from '@/lib/auth-context';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatDate, isOverdue } from '@/lib/format';
import { getComments } from '@/lib/queries/comments';
import { getOnboarding } from '@/lib/queries/onboarding';
import { getProject } from '@/lib/queries/projects';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const project = await getProject(id);
  if (!project) return null;

  const [
    onboarding,
    comments,
    { data: tasks },
    { data: milestones },
    { data: plan },
    { data: activity },
    { data: pages },
    { data: handover },
  ] = await Promise.all([
    getOnboarding(id),
    getComments({ entityType: 'project', entityId: id }),
    supabase
      .from('tasks')
      .select('id, title, due_date, status, responsibility')
      .eq('project_id', id)
      .eq('responsibility', 'client')
      .neq('status', 'complete')
      .is('deleted_at', null)
      .order('due_date', { nullsFirst: false }),
    supabase
      .from('project_milestones')
      .select('id, title, target_date, completed_at, owner_side')
      .eq('project_id', id)
      .order('position'),
    supabase
      .from('project_plans')
      .select('scope, objectives, client_responsibilities, agency_responsibilities')
      .eq('project_id', id)
      .maybeSingle(),
    supabase
      .from('activity_logs')
      .select('id, summary, created_at, actor_name')
      .eq('project_id', id)
      .eq('visibility', 'client')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('website_pages').select('id, status').eq('project_id', id).is('deleted_at', null),
    supabase.from('handovers').select('id, status').eq('project_id', id).maybeSingle(),
  ]);

  return { project, onboarding, comments, tasks, milestones, plan, activity, pages, handover };
}

export function PortalProjectPage() {
  const { id = '' } = useParams();
  const { userId } = useAuth();
  const query = useQuery(() => load(id), [id]);
  useDocumentTitle(query.data?.project.name ?? 'Project');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !userId) return <NotFoundPage />;
        const { project, onboarding, comments, tasks, milestones, plan, activity, pages, handover } =
          data;

        const client = project.clients as unknown as { id: string };
        const stage = project.lifecycle_stages as unknown as {
          label: string;
          colour: string;
        } | null;
        const clientActions = tasks ?? [];
        const pagesNeedingContent = (pages ?? []).filter(
          (p) => p.status === 'draft' || p.status === 'needs_changes',
        ).length;

        return (
          <>
            <PageHeader
              title={project.name}
              breadcrumbs={[
                { label: 'Projects', href: '/portal/projects' },
                { label: project.name },
              ]}
              meta={
                <>
                  {stage ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px]">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: stage.colour }}
                        aria-hidden="true"
                      />
                      {stage.label}
                    </span>
                  ) : null}
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {PROJECT_TYPE_LABELS[project.project_type]}
                    {project.target_launch_date
                      ? ` · planned launch ${formatDate(project.target_launch_date)}`
                      : ''}
                  </span>
                </>
              }
            />

            {/* What needs doing, front and centre. */}
            <section aria-label="Your actions" className="mb-6 grid gap-3 sm:grid-cols-3">
              {onboarding.sections.length > 0 && onboarding.completion < 100 ? (
                <Link
                  to={`/portal/projects/${id}/onboarding`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 transition-colors hover:brightness-[0.98]"
                >
                  <ClipboardList
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-text)]"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-[14px] font-semibold text-[var(--accent-text)]">
                      Continue onboarding
                    </span>
                    <span className="block text-[12px] text-[var(--text-secondary)]">
                      {onboarding.completion}% complete
                    </span>
                  </span>
                </Link>
              ) : null}

              {pagesNeedingContent > 0 ? (
                <Link
                  to={`/portal/projects/${id}/content`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <FileText
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-[14px] font-semibold">Website content</span>
                    <span className="block text-[12px] text-[var(--text-secondary)]">
                      {pagesNeedingContent} page{pagesNeedingContent === 1 ? '' : 's'} need your
                      words
                    </span>
                  </span>
                </Link>
              ) : null}

              {handover && (handover.status === 'delivered' || handover.status === 'accepted') ? (
                <Link
                  to={`/portal/projects/${id}/handover`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <Rocket
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-[14px] font-semibold">Handover pack</span>
                    <span className="block text-[12px] text-[var(--text-secondary)]">
                      {handover.status === 'accepted'
                        ? 'Accepted — documents available'
                        : 'Ready for you to review'}
                    </span>
                  </span>
                </Link>
              ) : null}

              <Link
                to={`/portal/requests/new?project=${id}`}
                className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <Upload
                  className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-[14px] font-semibold">Request a change</span>
                  <span className="block text-[12px] text-[var(--text-secondary)]">
                    Ask us to change something
                  </span>
                </span>
              </Link>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader title="Progress" />
                  <CardBody className="space-y-3">
                    <ProgressBar
                      value={project.completion_percentage}
                      label="Overall"
                      size="lg"
                    />
                    {onboarding.sections.length > 0 ? (
                      <ProgressBar value={onboarding.completion} label="Onboarding" size="sm" />
                    ) : null}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="What we need from you" />
                  {clientActions.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle2}
                      title="Nothing outstanding"
                      description="We have everything we need at the moment."
                    />
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {clientActions.map((task) => {
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
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                {plan?.scope || plan?.objectives ? (
                  <Card>
                    <CardHeader title="What we are delivering" />
                    <CardBody className="space-y-4">
                      {plan.objectives ? (
                        <div>
                          <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                            Objectives
                          </h3>
                          <p className="mt-0.5 text-[13px] whitespace-pre-wrap">
                            {plan.objectives}
                          </p>
                        </div>
                      ) : null}
                      {plan.scope ? (
                        <div>
                          <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                            Scope
                          </h3>
                          <p className="mt-0.5 text-[13px] whitespace-pre-wrap">{plan.scope}</p>
                        </div>
                      ) : null}
                      {plan.client_responsibilities ? (
                        <div>
                          <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                            What we need from you
                          </h3>
                          <p className="mt-0.5 text-[13px] whitespace-pre-wrap">
                            {plan.client_responsibilities}
                          </p>
                        </div>
                      ) : null}
                    </CardBody>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader title="Messages" description="Talk to us about this project." />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="project"
                      entityId={id}
                      projectId={id}
                      clientId={client.id}
                      currentUserId={userId}
                      canWriteInternal={false}
                      placeholder="Ask us anything about this project…"
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader title="Key dates" />
                  <CardBody>
                    <MilestoneTimeline
                      milestones={milestones ?? []}
                      emptyMessage="We will add key dates as the project takes shape."
                    />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="Files"
                    action={
                      <Link
                        to="/portal/files"
                        className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                      >
                        All files
                      </Link>
                    }
                  />
                  <CardBody>
                    <Button variant="secondary" className="w-full" asChild>
                      <Link to="/portal/files">
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Upload a file
                      </Link>
                    </Button>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="What has happened" />
                  <CardBody>
                    {(activity ?? []).length === 0 ? (
                      <p className="text-[13px] text-[var(--text-muted)]">Nothing yet.</p>
                    ) : (
                      <Timeline
                        entries={(activity ?? []).map((entry) => ({
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
