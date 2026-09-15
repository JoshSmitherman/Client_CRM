import { notFound } from 'next/navigation';

import { DeliverableList, type DeliverableRow } from '@/components/planning/deliverable-list';
import { MilestoneList, type MilestoneRow } from '@/components/planning/milestone-list';
import { PlanEditor } from '@/components/planning/plan-editor';
import { RiskRegister, type RiskRow } from '@/components/planning/risk-register';
import { requireAgency } from '@/lib/auth';
import { getAgencyStaff, getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export default async function ProjectPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();

  const [{ data: plan }, { data: milestones }, { data: deliverables }, { data: risks }, staff] =
    await Promise.all([
      supabase.from('project_plans').select('*').eq('project_id', id).maybeSingle(),
      supabase
        .from('project_milestones')
        .select('id, title, description, target_date, completed_at, owner_side, depends_on_id')
        .eq('project_id', id)
        .order('position'),
      supabase
        .from('project_deliverables')
        .select('id, title, description, owner_side, due_date, is_complete')
        .eq('project_id', id)
        .order('position'),
      supabase
        .from('project_risks')
        .select('id, title, description, likelihood, impact, mitigation, status, owner:users!project_risks_owner_id_fkey ( full_name )')
        .eq('project_id', id)
        .order('created_at'),
      getAgencyStaff(),
    ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <PlanEditor projectId={id} plan={plan} />
      </div>

      <div className="space-y-4">
        <MilestoneList projectId={id} milestones={(milestones ?? []) as MilestoneRow[]} />
        <DeliverableList projectId={id} deliverables={(deliverables ?? []) as DeliverableRow[]} />
        <RiskRegister projectId={id} risks={(risks ?? []) as unknown as RiskRow[]} staff={staff} />
      </div>
    </div>
  );
}
