import { DeliverableList, type DeliverableRow } from '@/components/planning/deliverable-list';
import { MilestoneList, type MilestoneRow } from '@/components/planning/milestone-list';
import { PlanEditor } from '@/components/planning/plan-editor';
import { RiskRegister, type RiskRow } from '@/components/planning/risk-register';
import { QueryBoundary } from '@/components/routing/page-state';
import { useQuery } from '@/lib/data/use-query';
import { getInternalNote } from '@/lib/internal-notes';
import { getAgencyStaff } from '@/lib/queries/projects';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

async function load(projectId: string) {
  const [{ data: plan }, { data: milestones }, { data: deliverables }, { data: risks }, staff] =
    await Promise.all([
      supabase.from('project_plans').select('*').eq('project_id', projectId).maybeSingle(),
      supabase
        .from('project_milestones')
        .select('id, title, description, target_date, completed_at, owner_side, depends_on_id')
        .eq('project_id', projectId)
        .order('position'),
      supabase
        .from('project_deliverables')
        .select('id, title, description, owner_side, due_date, is_complete')
        .eq('project_id', projectId)
        .order('position'),
      supabase
        .from('project_risks')
        .select(
          'id, title, description, likelihood, impact, mitigation, status, owner:users!project_risks_owner_id_fkey ( full_name )',
        )
        .eq('project_id', projectId)
        .order('created_at'),
      getAgencyStaff(),
    ]);

  // The plan's internal note lives in its own table, so it needs the plan id.
  const internalNote = plan ? await getInternalNote('project_plan', plan.id) : '';

  return { plan, milestones, deliverables, risks, staff, internalNote };
}

export function ProjectPlanningTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => load(projectId), [projectId]);

  return (
    <QueryBoundary query={query}>
      {({ plan, milestones, deliverables, risks, staff, internalNote }) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <PlanEditor projectId={projectId} plan={plan} internalNote={internalNote} />
          </div>

          <div className="space-y-4">
            <MilestoneList
              projectId={projectId}
              milestones={(milestones ?? []) as MilestoneRow[]}
            />
            <DeliverableList
              projectId={projectId}
              deliverables={(deliverables ?? []) as DeliverableRow[]}
            />
            <RiskRegister
              projectId={projectId}
              risks={(risks ?? []) as unknown as RiskRow[]}
              staff={staff}
            />
          </div>
        </div>
      )}
    </QueryBoundary>
  );
}
