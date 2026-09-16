import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { StageStepper } from '@/components/projects/stage-stepper';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { Tabs } from '@/components/ui/tabs';
import {
  PROJECT_HEALTH_LABELS,
  PROJECT_HEALTH_TONES,
  PROJECT_TYPE_LABELS,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatDate } from '@/lib/format';
import {
  getLifecycleStages,
  getProject,
  getProjectTabCounts,
  type ProjectDetail,
} from '@/lib/queries/projects';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

export interface ProjectWorkspaceContext {
  projectId: string;
  project: ProjectDetail;
  /** Re-reads the project header after a tab changes something. */
  refresh: () => void;
}

/**
 * Every tab needs the project, so the workspace loads it once and hands it down
 * through the router outlet rather than each tab fetching it again.
 */
export function useProjectWorkspace(): ProjectWorkspaceContext {
  return useOutletContext<ProjectWorkspaceContext>();
}

async function load(id: string) {
  const project = await getProject(id);
  if (!project) return null;

  const [counts, stages] = await Promise.all([getProjectTabCounts(id), getLifecycleStages()]);
  return { project, counts, stages };
}

export function ProjectWorkspace() {
  const { id = '' } = useParams();
  const query = useQuery(() => load(id), [id]);
  useDocumentTitle(query.data?.project.name ?? 'Project');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data) return <NotFoundPage />;
        const { project, counts, stages } = data;

        const client = project.clients as unknown as { id: string; company_name: string };
        const stage = project.lifecycle_stages as unknown as
          | { id: string; label: string; colour: string; position: number }
          | null;

        const base = `/projects/${id}`;

        const tabs = [
          { href: base, label: 'Overview' },
          { href: `${base}/planning`, label: 'Planning' },
          { href: `${base}/onboarding`, label: 'Onboarding', count: counts.onboarding },
          { href: `${base}/tasks`, label: 'Tasks', count: counts.tasks },
          { href: `${base}/content`, label: 'Content' },
          { href: `${base}/files`, label: 'Files', count: counts.files },
          { href: `${base}/changes`, label: 'Changes', count: counts.changes },
          { href: `${base}/support`, label: 'Support', count: counts.support },
          { href: `${base}/handover`, label: 'Handover' },
          { href: `${base}/maintenance`, label: 'Maintenance' },
          { href: `${base}/comments`, label: 'Comments', count: counts.comments },
          { href: `${base}/activity`, label: 'Activity' },
          { href: `${base}/settings`, label: 'Settings' },
        ];

        const context: ProjectWorkspaceContext = {
          projectId: id,
          project,
          refresh: query.refetch,
        };

        return (
          <>
            <header className="mb-5">
              <nav aria-label="Breadcrumb" className="mb-2 text-[12px] text-[var(--text-muted)]">
                <Link to="/projects" className="hover:text-[var(--text-primary)] hover:underline">
                  Projects
                </Link>
                <span className="mx-1">/</span>
                <Link
                  to={`/clients/${client.id}`}
                  className="hover:text-[var(--text-primary)] hover:underline"
                >
                  {client.company_name}
                </Link>
              </nav>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {project.name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                    <span className="font-mono text-[12px]">{project.reference}</span>
                    <span aria-hidden="true">·</span>
                    <span>{PROJECT_TYPE_LABELS[project.project_type]}</span>
                    {project.target_launch_date ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Launch {formatDate(project.target_launch_date)}</span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={PROJECT_HEALTH_TONES[project.health]} dot>
                    {PROJECT_HEALTH_LABELS[project.health]}
                  </Badge>
                  <div className="w-36">
                    <ProgressBar
                      value={project.completion_percentage}
                      label="Complete"
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <StageStepper
                projectId={id}
                stages={stages}
                currentStageId={stage?.id ?? null}
                className="mt-4"
              />
            </header>

            <Tabs items={tabs} className="mb-5" />

            <Outlet context={context} />
          </>
        );
      }}
    </QueryBoundary>
  );
}
