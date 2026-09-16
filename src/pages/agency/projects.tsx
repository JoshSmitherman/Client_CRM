import { Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { FilterBar } from '@/components/dashboard/filter-bar';
import { ProjectTable } from '@/components/projects/project-table';
import { QueryBoundary } from '@/components/routing/page-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@/lib/data/use-query';
import { getFilterOptions, getProjects, type DashboardFilters } from '@/lib/queries/dashboard';
import type { Enums } from '@/lib/supabase/database.types';
import { useDocumentTitle } from '@/lib/use-document-title';

function parseFilters(params: URLSearchParams): DashboardFilters {
  const one = (key: string) => params.get(key) ?? undefined;

  const completion = one('completion');
  const [min, max] = completion ? completion.split('-').map(Number) : [];

  return {
    clientId: one('client'),
    staffId: one('staff'),
    stageKey: one('stage'),
    projectType: one('type') as Enums<'project_type'> | undefined,
    planId: one('plan'),
    search: one('q'),
    minCompletion: Number.isFinite(min) ? min : undefined,
    maxCompletion: Number.isFinite(max) ? max : undefined,
  };
}

export function ProjectsPage() {
  useDocumentTitle('Projects');
  const [params] = useSearchParams();
  const search = params.toString();

  const options = useQuery(getFilterOptions, []);
  const projects = useQuery(
    () => getProjects(parseFilters(new URLSearchParams(search)), 200),
    [search],
  );

  const count = projects.data?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Projects"
        description={
          projects.isLoading
            ? 'Loading your book of work…'
            : `${count} project${count === 1 ? '' : 's'} matching your filters.`
        }
        actions={
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Link>
          </Button>
        }
      />

      <QueryBoundary query={options} skeleton={<div className="mb-5 h-24" />}>
        {(o) => <FilterBar options={o} />}
      </QueryBoundary>

      <Card>
        <QueryBoundary query={projects}>{(rows) => <ProjectTable projects={rows} />}</QueryBoundary>
      </Card>
    </>
  );
}
