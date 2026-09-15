import type { Metadata } from 'next';

import { ProjectForm } from '@/components/projects/project-form';
import { PageHeader } from '@/components/ui/page-header';
import { createProjectAction } from '@/lib/actions/projects';
import { requireAgency } from '@/lib/auth';
import { getClients } from '@/lib/queries/clients';
import { getLifecycleStages } from '@/lib/queries/projects';

export const metadata: Metadata = { title: 'New project' };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  await requireAgency();
  const { client } = await searchParams;

  const [clients, stages] = await Promise.all([getClients(), getLifecycleStages()]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New project"
        description="Sets up the workspace, planning space and onboarding questionnaire."
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New' }]}
      />
      <ProjectForm
        action={createProjectAction}
        clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
        stages={stages}
        defaultClientId={client}
        submitLabel="Create project"
        cancelHref="/projects"
      />
    </div>
  );
}
