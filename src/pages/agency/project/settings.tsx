import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProjectMembers } from '@/components/projects/project-members';
import { ProjectSettingsForm } from '@/components/projects/project-settings-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import {
  deleteProjectPermanentlyAction,
  getProjectDeletionImpact,
  type DeletionImpact,
} from '@/lib/actions/destroy';
import { useProfile } from '@/lib/auth-context';
import { canDeleteRecords } from '@/lib/permissions';
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
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);

  const query = useQuery(() => load(projectId), [projectId]);
  const canDelete = canDeleteRecords(profile.role);

  // Counted when the dialog opens, so the warning can be specific.
  useEffect(() => {
    if (!deleteOpen) return;
    let cancelled = false;
    void getProjectDeletionImpact(projectId).then((result) => {
      if (!cancelled) setImpact(result);
    });
    return () => {
      cancelled = true;
    };
  }, [deleteOpen, projectId]);

  return (
    <QueryBoundary query={query}>
      {({ stages, members, staff, internalNote }) => (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProjectSettingsForm project={project} stages={stages} internalNote={internalNote} />
          </div>
          <div className="space-y-4">
            <ProjectMembers
              projectId={projectId}
              members={members}
              staff={staff}
              canManage={
                profile.role === 'agency_admin' || profile.role === 'project_manager'
              }
            />

            {canDelete ? (
              <Card>
                <CardHeader
                  title="Danger zone"
                  description="Archiving keeps everything and hides the project. Deleting does not."
                />
                <CardBody>
                  <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete this project
                  </Button>
                </CardBody>
              </Card>
            ) : null}
          </div>

          <ConfirmDelete
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title={`Delete ${project.name}`}
            confirmationText={project.reference}
            confirmLabel="Delete this project"
            consequences={
              impact
                ? [
                    `${impact.files} file${impact.files === 1 ? '' : 's'}, deleted from storage as well as from the record.`,
                    `${impact.changeRequests} change request${impact.changeRequests === 1 ? '' : 's'} and ${impact.supportRequests} support ticket${impact.supportRequests === 1 ? '' : 's'} raised against this project.`,
                    'Every task, page of content, comment, milestone and approval on it.',
                    'The handover pack and anything the client has accepted.',
                    'The client itself stays, along with their other projects.',
                    'The audit log keeps a record that this happened, and who did it.',
                  ]
                : ['Working out what this would remove…']
            }
            onConfirm={async () => {
              await deleteProjectPermanentlyAction(projectId);
              navigate('/projects');
            }}
          />
        </div>
      )}
    </QueryBoundary>
  );
}
