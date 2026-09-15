import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { FilterBar } from '@/components/dashboard/filter-bar';
import { ProjectTable } from '@/components/projects/project-table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAgency } from '@/lib/auth';
import { getFilterOptions, getProjects, type DashboardFilters } from '@/lib/queries/dashboard';
import type { Enums } from '@/lib/supabase/database.types';

export const metadata: Metadata = { title: 'Projects' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAgency();
  const params = await searchParams;

  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const completion = one('completion');
  const [min, max] = completion ? completion.split('-').map(Number) : [];

  const filters: DashboardFilters = {
    clientId: one('client'),
    staffId: one('staff'),
    stageKey: one('stage'),
    projectType: one('type') as Enums<'project_type'> | undefined,
    planId: one('plan'),
    search: one('q'),
    minCompletion: Number.isFinite(min) ? min : undefined,
    maxCompletion: Number.isFinite(max) ? max : undefined,
  };

  const [options, projects] = await Promise.all([getFilterOptions(), getProjects(filters, 200)]);

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${projects.length} project${projects.length === 1 ? '' : 's'} matching your filters.`}
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Link>
          </Button>
        }
      />

      <FilterBar options={options} />

      <Card>
        <ProjectTable projects={projects} />
      </Card>
    </>
  );
}
