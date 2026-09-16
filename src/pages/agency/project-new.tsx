import { useSearchParams } from 'react-router-dom';

import { ProjectForm } from '@/components/projects/project-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { PageHeader } from '@/components/ui/page-header';
import { createProjectAction } from '@/lib/actions/projects';
import { useQuery } from '@/lib/data/use-query';
import { getClients } from '@/lib/queries/clients';
import { getLifecycleStages } from '@/lib/queries/projects';
import { useDocumentTitle } from '@/lib/use-document-title';

export function NewProjectPage() {
  useDocumentTitle('New project');
  const [params] = useSearchParams();
  const defaultClientId = params.get('client') ?? undefined;

  const query = useQuery(() => Promise.all([getClients(), getLifecycleStages()]), []);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New project"
        description="Sets up the workspace, planning space and onboarding questionnaire."
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New' }]}
      />
      <QueryBoundary query={query}>
        {([clients, stages]) => (
          <ProjectForm
            action={createProjectAction}
            clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
            stages={stages}
            defaultClientId={defaultClientId}
            submitLabel="Create project"
            cancelHref="/projects"
          />
        )}
      </QueryBoundary>
    </div>
  );
}
