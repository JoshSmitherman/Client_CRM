import { ProjectMembers } from '@/components/projects/project-members';
import { ProjectSettingsForm } from '@/components/projects/project-settings-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { useProfile } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { getInternalNote } from '@/lib/internal-notes';
import { getAgencyStaff, getLifecycleStages, getProjectMembers } from '@/lib/queries/projects';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

async function load(projectId: string) {
  const [stages, members, staff, internalNote] = await Promise.all([
    getLifecycleStages(),
    getProjectMembers(projectId),
    getAgencyStaff(),
    getInternalNote('project', projectId),
  ]);

  return { stages, members, staff, internalNote };
}

export function ProjectSettingsTab() {
  const { projectId, project } = useProjectWorkspace();
  const profile = useProfile();
  const query = useQuery(() => load(projectId), [projectId]);

  return (
    <QueryBoundary query={query}>
      {({ stages, members, staff, internalNote }) => (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProjectSettingsForm project={project} stages={stages} internalNote={internalNote} />
          </div>
          <div>
            <ProjectMembers
              projectId={projectId}
              members={members}
              staff={staff}
              canManage={
                profile.role === 'agency_admin' || profile.role === 'project_manager'
              }
            />
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}
