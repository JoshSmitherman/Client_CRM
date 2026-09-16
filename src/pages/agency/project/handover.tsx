import { Rocket } from 'lucide-react';
import { useState } from 'react';

import { ChecklistEditor, type HandoverItemRow } from '@/components/handover/checklist-editor';
import { DocumentList, type HandoverDocumentRow } from '@/components/handover/document-list';
import { HandoverForm } from '@/components/handover/handover-form';
import { HandoverStatusPanel } from '@/components/handover/handover-status';
import { QueryBoundary } from '@/components/routing/page-state';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { createHandoverAction } from '@/lib/actions/handover';
import { useQuery } from '@/lib/data/use-query';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import { useProjectWorkspace } from '@/pages/agency/project-workspace';

const FALLBACK_GUIDANCE =
  'Never record passwords here. Share credentials using an approved secure method.';

async function load(projectId: string) {
  const [{ data: handover }, { data: settings }] = await Promise.all([
    supabase.from('handovers').select('*').eq('project_id', projectId).maybeSingle(),
    supabase.from('agency_settings').select('credential_sharing_guidance').maybeSingle(),
  ]);

  const guidance = settings?.credential_sharing_guidance ?? FALLBACK_GUIDANCE;

  if (!handover) return { handover: null, guidance } as const;

  const [{ data: checklist }, { data: items }, { data: documents }, { data: acceptances }] =
    await Promise.all([
      supabase
        .from('handover_checklists')
        .select('id')
        .eq('handover_id', handover.id)
        .order('position')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('handover_items')
        .select('id, title, description, status, completed_by')
        .eq('project_id', projectId)
        .order('position'),
      supabase
        .from('handover_documents')
        .select('id, title, doc_type, description, external_url, visible_to_client, file_id')
        .eq('handover_id', handover.id)
        .order('position'),
      supabase
        .from('client_acceptances')
        .select('*')
        .eq('project_id', projectId)
        .order('accepted_at', { ascending: false }),
    ]);

  return { handover, guidance, checklist, items, documents, acceptances } as const;
}

/** Starts the handover, then reloads so the pack appears without a refresh. */
function StartHandover({ projectId, onStarted }: { projectId: string; onStarted: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={isPending}
        onClick={async () => {
          setIsPending(true);
          setError(null);
          try {
            await createHandoverAction(projectId);
            onStarted();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not start the handover.');
          } finally {
            setIsPending(false);
          }
        }}
      >
        {isPending ? 'Starting…' : 'Start the handover'}
      </Button>
      {error ? <p className="text-[12px] text-[var(--danger-text)]">{error}</p> : null}
    </div>
  );
}

export function ProjectHandoverTab() {
  const { projectId } = useProjectWorkspace();
  const query = useQuery(() => load(projectId), [projectId]);

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data.handover) {
          return (
            <Card>
              <EmptyState
                icon={Rocket}
                title="Handover not started"
                description="Prepare the handover pack as launch approaches: website details, the launch checklist, and the documentation the client keeps."
                action={<StartHandover projectId={projectId} onStarted={query.refetch} />}
              />
            </Card>
          );
        }

        const { handover, guidance, checklist, items, documents, acceptances } = data;
        const rows = (items ?? []) as HandoverItemRow[];
        const outstanding = rows.filter(
          (i) => i.status !== 'complete' && i.status !== 'not_applicable',
        ).length;

        return (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <HandoverForm handover={handover} credentialGuidance={guidance} />

              {checklist ? (
                <ChecklistEditor
                  checklistId={checklist.id}
                  projectId={projectId}
                  items={rows}
                  canEdit={handover.status !== 'accepted'}
                />
              ) : null}

              <DocumentList
                handoverId={handover.id}
                projectId={projectId}
                documents={(documents ?? []) as HandoverDocumentRow[]}
                canEdit={handover.status !== 'accepted'}
              />
            </div>

            <div className="space-y-4">
              <HandoverStatusPanel
                handoverId={handover.id}
                status={handover.status}
                deliveredAt={handover.delivered_at}
                outstandingItems={outstanding}
              />

              {(acceptances ?? []).length > 0 ? (
                <Card>
                  <CardHeader
                    title="Client acceptance"
                    description="Permanent record — part of the audit history."
                  />
                  <CardBody className="space-y-3">
                    {(acceptances ?? []).map((acceptance) => (
                      <div key={acceptance.id} className="space-y-1 text-[13px]">
                        <p className="font-medium">{acceptance.signature_name}</p>
                        <p className="text-[12px] text-[var(--text-muted)]">
                          {formatDateTime(acceptance.accepted_at)}
                          {acceptance.project_version ? ` · ${acceptance.project_version}` : ''}
                        </p>
                        <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
                          {acceptance.statement}
                        </p>
                        <ul className="space-y-0.5 text-[12px] text-[var(--text-muted)]">
                          <li>Website reviewed</li>
                          <li>Requested changes completed</li>
                          <li>Approved for launch</li>
                          <li>Handover materials received</li>
                          <li>
                            {acceptance.training_not_applicable
                              ? 'Training not applicable'
                              : 'Training received'}
                          </li>
                          <li>Maintenance arrangement understood</li>
                        </ul>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              ) : null}
            </div>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
