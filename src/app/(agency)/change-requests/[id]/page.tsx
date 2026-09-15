import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Lock } from 'lucide-react';

import { CommentThread } from '@/components/comments/comment-thread';
import { EffortPanel } from '@/components/change-requests/effort-panel';
import { QuotePanel, type QuoteRow } from '@/components/change-requests/quote-panel';
import { TriagePanel } from '@/components/change-requests/triage-panel';
import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Timeline } from '@/components/ui/timeline';
import {
  BILLING_TREATMENT_LABELS,
  BILLING_TREATMENT_TONES,
  CHANGE_CATEGORY_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
} from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import { isAgencyManager } from '@/lib/permissions';
import {
  getChangeRequest,
  getChangeRequestAttachments,
  getChangeRequestQuotes,
  getChangeRequestTimeline,
} from '@/lib/queries/change-requests';
import { getComments } from '@/lib/queries/comments';
import { getAgencyStaff } from '@/lib/queries/projects';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const request = await getChangeRequest(id);
  return { title: request ? `${request.reference} · ${request.title}` : 'Change request' };
}

export default async function ChangeRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAgency();
  const { id } = await params;

  const request = await getChangeRequest(id);
  if (!request) notFound();

  const [quotes, timeline, attachments, comments, staff] = await Promise.all([
    getChangeRequestQuotes(id),
    getChangeRequestTimeline(id),
    getChangeRequestAttachments(id),
    getComments({ entityType: 'change_request', entityId: id }),
    getAgencyStaff(),
  ]);

  const client = request.clients as unknown as { id: string; company_name: string };
  const project = request.projects as unknown as { id: string; name: string };
  const submitter = request.submitter as unknown as { full_name: string } | null;

  return (
    <>
      <PageHeader
        title={request.title}
        breadcrumbs={[
          { label: 'Change requests', href: '/change-requests' },
          { label: request.reference },
        ]}
        meta={
          <>
            <Badge tone={CHANGE_STATUS_TONES[request.status]} dot>
              {CHANGE_STATUS_LABELS[request.status]}
            </Badge>
            <Badge tone={PRIORITY_TONES[request.priority]}>
              {PRIORITY_LABELS[request.priority]}
            </Badge>
            {request.billing_treatment ? (
              <Badge tone={BILLING_TREATMENT_TONES[request.billing_treatment]}>
                {BILLING_TREATMENT_LABELS[request.billing_treatment]}
              </Badge>
            ) : null}
            <span className="text-[12px] text-[var(--text-muted)]">
              {CHANGE_CATEGORY_LABELS[request.category]} · raised{' '}
              {formatDateTime(request.submitted_at)}
              {submitter ? ` by ${submitter.full_name}` : ''}
            </span>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="What was asked for" />
            <CardBody className="space-y-4">
              <div>
                <h3 className="text-[12px] font-medium text-[var(--text-muted)]">Description</h3>
                <p className="mt-0.5 text-[13px] whitespace-pre-wrap">{request.description}</p>
              </div>

              {request.desired_outcome ? (
                <div>
                  <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                    Desired result
                  </h3>
                  <p className="mt-0.5 text-[13px] whitespace-pre-wrap">
                    {request.desired_outcome}
                  </p>
                </div>
              ) : null}

              {request.affected_url ? (
                <div>
                  <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                    Affected page
                  </h3>
                  <a
                    href={request.affected_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-0.5 inline-flex items-center gap-1 text-[13px] break-all text-[var(--accent-text)] hover:underline"
                  >
                    {request.affected_url}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              ) : null}

              {request.rejected_reason ? (
                <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2">
                  <h3 className="text-[12px] font-medium text-[var(--danger-text)]">
                    Reason for rejection
                  </h3>
                  <p className="mt-0.5 text-[13px] text-[var(--danger-text)]">
                    {request.rejected_reason}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {attachments.length > 0 ? (
            <Card>
              <CardHeader title="Attachments" description="Screenshots and files from the client" />
              <FileGrid
                files={attachments as unknown as FileRow[]}
                canApprove={false}
                currentUserId={session.userId}
                isManager={isAgencyManager(session.profile.role)}
              />
            </Card>
          ) : null}

          <TriagePanel request={request} staff={staff} />

          <QuotePanel requestId={id} quotes={quotes as unknown as QuoteRow[]} />

          <EffortPanel
            requestId={id}
            loggedMinutes={request.logged_minutes}
            drawsDownAllowance={
              request.billing_treatment === 'included_in_plan' && Boolean(request.subscription_id)
            }
          />

          <Card>
            <CardHeader
              title="Discussion"
              description="Internal notes are highlighted and never reach the client."
            />
            <CardBody>
              <CommentThread
                comments={comments}
                entityType="change_request"
                entityId={id}
                projectId={request.project_id}
                clientId={request.client_id}
                currentUserId={session.userId}
                canWriteInternal
                isAdmin={session.profile.role === 'agency_admin'}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-2.5 text-[13px]">
              <Row label="Client">
                <Link href={`/clients/${client.id}`} className="hover:underline">
                  {client.company_name}
                </Link>
              </Row>
              <Row label="Project">
                <Link href={`/projects/${project.id}`} className="hover:underline">
                  {project.name}
                </Link>
              </Row>
              <Row label="Estimated effort">
                {request.estimated_hours ? `${request.estimated_hours} hours` : '—'}
              </Row>
              <Row label="Estimated cost">{formatCurrency(request.estimated_cost)}</Row>
              <Row label="Target completion">
                {request.estimated_completion_date
                  ? formatDate(request.estimated_completion_date)
                  : '—'}
              </Row>
              <Row label="Completed">
                {request.completed_at ? formatDateTime(request.completed_at) : '—'}
              </Row>
            </CardBody>
          </Card>

          {request.internal_notes ? (
            <Card>
              <CardHeader
                title={
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    Internal notes
                  </span>
                }
              />
              <CardBody>
                <p className="text-[13px] whitespace-pre-wrap text-[var(--text-secondary)]">
                  {request.internal_notes}
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Timeline"
              description="Every step is stored permanently."
            />
            <CardBody>
              {timeline.length === 0 ? (
                <p className="text-[13px] text-[var(--text-muted)]">Nothing recorded yet.</p>
              ) : (
                <Timeline
                  entries={timeline.map((entry) => ({
                    id: entry.id,
                    title: entry.summary,
                    meta: entry.actor_name ?? undefined,
                    timestamp: entry.created_at,
                    tone: entry.visibility === 'client' ? 'accent' : 'neutral',
                  }))}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
