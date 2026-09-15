import { notFound } from 'next/navigation';

import { ProjectSettingsForm } from '@/components/projects/project-settings-form';
import { ProjectMembers } from '@/components/projects/project-members';
import { requireAgency } from '@/lib/auth';
import { getInternalNote } from '@/lib/internal-notes';
import { getAgencyStaff, getLifecycleStages, getProject, getProjectMembers } from '@/lib/queries/projects';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const [stages, members, staff, internalNote] = await Promise.all([
    getLifecycleStages(),
    getProjectMembers(id),
    getAgencyStaff(),
    getInternalNote('project', id),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProjectSettingsForm project={project} stages={stages} internalNote={internalNote} />
      </div>
      <div>
        <ProjectMembers
          projectId={id}
          members={members}
          staff={staff}
          canManage={session.profile.role === 'agency_admin' || session.profile.role === 'project_manager'}
        />
      </div>
    </div>
  );
}
