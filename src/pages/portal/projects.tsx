import { Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

async function load() {
  // No client filter is needed: the SELECT policy already restricts these rows
  // to the signed-in person's own organisation.
  const { data } = await supabase
    .from('projects')
    .select(
      'id, name, reference, project_type, description, completion_percentage, target_launch_date, actual_launch_date, archived_at, updated_at, lifecycle_stages ( key, label, colour )',
    )
    .is('deleted_at', null)
    .order('archived_at', { nullsFirst: true })
    .order('updated_at', { ascending: false });

  return data ?? [];
}

export function PortalProjectsPage() {
  useDocumentTitle('Projects');
  const query = useQuery(load, []);

  return (
    <>
      <PageHeader title="Your projects" description="Everything we are working on for you." />

      <QueryBoundary query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={Briefcase}
                title="No projects yet"
                description="When we start work, your project will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((project) => {
                const stage = project.lifecycle_stages as unknown as
                  | { label: string; colour: string }
                  | null;

                return (
                  <Link
                    key={project.id}
                    to={`/portal/projects/${project.id}`}
                    className="surface-card block p-5 transition-shadow hover:shadow-[var(--shadow-raised)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-[15px] font-semibold">{project.name}</h2>
                      {project.archived_at ? (
                        <Badge tone="neutral">Archived</Badge>
                      ) : stage ? (
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

                    <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                      {PROJECT_TYPE_LABELS[project.project_type]}
                    </p>

                    {project.description ? (
                      <p className="mt-2 line-clamp-2 text-[13px] text-[var(--text-secondary)]">
                        {project.description}
                      </p>
                    ) : null}

                    <ProgressBar
                      className="mt-3"
                      value={project.completion_percentage}
                      label="Progress"
                    />

                    <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                      {project.actual_launch_date
                        ? `Launched ${formatDate(project.actual_launch_date)}`
                        : project.target_launch_date
                          ? `Planned launch ${formatDate(project.target_launch_date)}`
                          : 'Launch date to be confirmed'}
                    </p>
                  </Link>
                );
              })}
            </div>
          )
        }
      </QueryBoundary>
    </>
  );
}
