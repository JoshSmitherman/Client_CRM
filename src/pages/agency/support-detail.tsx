import { Clock, ExternalLink, Lock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { CommentThread } from '@/components/comments/comment-thread';
import { QueryBoundary } from '@/components/routing/page-state';
import { SupportTriagePanel } from '@/components/support/triage-panel';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { PageHeader } from '@/components/ui/page-header';
import { Timeline } from '@/components/ui/timeline';
import { useAuth } from '@/lib/auth-context';
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
  URGENCY_LABELS,
  URGENCY_TONES,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatDateTime, formatDuration, formatRelative } from '@/lib/format';
import { getInternalNote } from '@/lib/internal-notes';
import { getComments } from '@/lib/queries/comments';
import { getAgencyStaff } from '@/lib/queries/projects';
import { getSupportRequest } from '@/lib/queries/support';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const ticket = await getSupportRequest(id);
  if (!ticket) return null;

  const [comments, staff, internalNote, { data: timeline }] = await Promise.all([
    getComments({ entityType: 'support_request', entityId: id }),
    getAgencyStaff(),
    getInternalNote('support_request', id),
    supabase
      .from('activity_logs')
      .select('id, summary, created_at, actor_name, visibility')
      .eq('entity_type', 'support_request')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
  ]);

  return { ticket, comments, staff, internalNote, timeline: timeline ?? [] };
}

export function SupportDetailPage() {
  const { id = '' } = useParams();
  const { profile, userId } = useAuth();
  const query = useQuery(() => load(id), [id]);

  const ticket = query.data?.ticket;
  useDocumentTitle(ticket ? `${ticket.reference} · ${ticket.subject}` : 'Support ticket');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !profile || !userId) return <NotFoundPage />;
        const { ticket, comments, staff, internalNote, timeline } = data;

        const client = ticket.clients as unknown as { id: string; company_name: string };
        const project = ticket.projects as unknown as { id: string; name: string } | null;
        const submitter = ticket.submitter as unknown as { full_name: string } | null;
        const subscription = ticket.maintenance_subscriptions as unknown as
          | {
              id: string;
              status: string;
              maintenance_plans: { name: string; response_time_hours: number | null } | null;
            }
          | null;

        return (
          <>
            <PageHeader
              title={ticket.subject}
              breadcrumbs={[{ label: 'Support', href: '/support' }, { label: ticket.reference }]}
              meta={
                <>
                  <Badge tone={URGENCY_TONES[ticket.urgency]} dot>
                    {URGENCY_LABELS[ticket.urgency]}
                  </Badge>
                  <Badge tone={SUPPORT_STATUS_TONES[ticket.status]}>
                    {SUPPORT_STATUS_LABELS[ticket.status]}
                  </Badge>
                  {ticket.covered_by_plan === true ? (
                    <Badge tone="success">Covered by plan</Badge>
                  ) : null}
                  {ticket.covered_by_plan === false ? (
                    <Badge tone="warning">Chargeable</Badge>
                  ) : null}
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {SUPPORT_CATEGORY_LABELS[ticket.category]} · raised{' '}
                    {formatDateTime(ticket.submitted_at)}
                    {submitter ? ` by ${submitter.full_name}` : ''}
                  </span>
                </>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader title="What was reported" />
                  <CardBody className="space-y-4">
                    <p className="text-[13px] whitespace-pre-wrap">{ticket.description}</p>

                    {ticket.affected_url ? (
                      <a
                        href={ticket.affected_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[13px] break-all text-[var(--accent-text)] hover:underline"
                      >
                        {ticket.affected_url}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    ) : null}

                    {ticket.resolution_summary ? (
                      <div className="rounded-lg bg-[var(--success-soft)] px-3 py-2">
                        <h3 className="text-[12px] font-medium text-[var(--success-text)]">
                          Resolution
                        </h3>
                        <p className="mt-0.5 text-[13px] text-[var(--success-text)]">
                          {ticket.resolution_summary}
                        </p>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>

                <SupportTriagePanel
                  ticket={ticket}
                  staff={staff}
                  hasSubscription={Boolean(subscription)}
                  internalNote={internalNote}
                />

                <Card>
                  <CardHeader
                    title="Discussion"
                    description="Internal notes never reach the client."
                  />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="support_request"
                      entityId={id}
                      projectId={ticket.project_id}
                      clientId={ticket.client_id}
                      currentUserId={userId}
                      canWriteInternal
                      isAdmin={profile.role === 'agency_admin'}
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader title="Details" />
                  <CardBody className="space-y-2.5 text-[13px]">
                    <DetailRow label="Client">
                      <Link to={`/clients/${client.id}`} className="hover:underline">
                        {client.company_name}
                      </Link>
                    </DetailRow>
                    <DetailRow label="Website">
                      {project ? (
                        <Link to={`/projects/${project.id}`} className="hover:underline">
                          {project.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </DetailRow>
                    <DetailRow label="Time spent">
                      {formatDuration(ticket.time_spent_minutes)}
                    </DetailRow>
                    <DetailRow label="First response">
                      {ticket.first_response_at
                        ? formatRelative(ticket.first_response_at)
                        : 'Not yet'}
                    </DetailRow>
                    <DetailRow label="Resolved">
                      {ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'}
                    </DetailRow>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Maintenance cover" />
                  <CardBody className="text-[13px]">
                    {subscription?.maintenance_plans ? (
                      <>
                        <p className="font-medium">{subscription.maintenance_plans.name}</p>
                        {subscription.maintenance_plans.response_time_hours ? (
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {subscription.maintenance_plans.response_time_hours}-hour response
                            target
                          </p>
                        ) : null}
                        {ticket.response_due_at ? (
                          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                            Response due {formatRelative(ticket.response_due_at)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-[var(--text-muted)]">
                        No active maintenance subscription for this client.
                      </p>
                    )}
                  </CardBody>
                </Card>

                {internalNote ? (
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
                        {internalNote}
                      </p>
                    </CardBody>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader title="Timeline" />
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
      }}
    </QueryBoundary>
  );
}
