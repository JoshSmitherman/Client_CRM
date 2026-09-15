import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StageStepper } from '@/components/projects/stage-stepper';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { Tabs } from '@/components/ui/tabs';
import { PROJECT_HEALTH_LABELS, PROJECT_HEALTH_TONES, PROJECT_TYPE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import { getLifecycleStages, getProject, getProjectTabCounts } from '@/lib/queries/projects';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.name ?? 'Project' };
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const [counts, stages] = await Promise.all([getProjectTabCounts(id), getLifecycleStages()]);

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

  return (
    <>
      <header className="mb-5">
        <nav aria-label="Breadcrumb" className="mb-2 text-[12px] text-[var(--text-muted)]">
          <Link href="/projects" className="hover:text-[var(--text-primary)] hover:underline">
            Projects
          </Link>
          <span className="mx-1">/</span>
          <Link
            href={`/clients/${client.id}`}
            className="hover:text-[var(--text-primary)] hover:underline"
          >
            {client.company_name}
          </Link>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.name}</h1>
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
              <ProgressBar value={project.completion_percentage} label="Complete" size="sm" />
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

      {children}
    </>
  );
}
