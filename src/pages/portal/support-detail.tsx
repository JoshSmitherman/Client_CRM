import { Clock, ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { CommentThread } from '@/components/comments/comment-thread';
import { QueryBoundary } from '@/components/routing/page-state';
import { CloseTicketButton } from '@/components/support/close-ticket';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
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
import { formatDate, formatDateTime } from '@/lib/format';
import { getComments } from '@/lib/queries/comments';
import { getSupportRequest } from '@/lib/queries/support';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const ticket = await getSupportRequest(id);
  if (!ticket) return null;

  const [comments, { data: timeline }] = await Promise.all([
    getComments({ entityType: 'support_request', entityId: id }),
    supabase
      .from('activity_logs')
      .select('id, summary, created_at')
      .eq('entity_type', 'support_request')
      .eq('entity_id', id)
      .eq('visibility', 'client')
      .order('created_at', { ascending: false }),
  ]);

  return { ticket, comments, timeline: timeline ?? [] };
}

export function PortalSupportDetailPage() {
  const { id = '' } = useParams();
  const { userId } = useAuth();
  const query = useQuery(() => load(id), [id]);

  useDocumentTitle(query.data?.ticket.subject ?? 'Support ticket');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !userId) return <NotFoundPage />;
        const { ticket, comments, timeline } = data;

        const plan = (
          ticket.maintenance_subscriptions as unknown as {
            maintenance_plans: { name: string; response_time_hours: number | null } | null;
          } | null
        )?.maintenance_plans;

        const canClose = ticket.status === 'resolved';

        return (
          <>
            <PageHeader
              title={ticket.subject}
              breadcrumbs={[
                { label: 'Support', href: '/portal/support' },
                { label: ticket.reference },
              ]}
              meta={
                <>
                  <Badge tone={SUPPORT_STATUS_TONES[ticket.status]} dot>
                    {SUPPORT_STATUS_LABELS[ticket.status]}
                  </Badge>
                  <Badge tone={URGENCY_TONES[ticket.urgency]}>
                    {URGENCY_LABELS[ticket.urgency]}
                  </Badge>
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {SUPPORT_CATEGORY_LABELS[ticket.category]} · raised{' '}
                    {formatDate(ticket.submitted_at)}
                  </span>
                </>
              }
              actions={canClose ? <CloseTicketButton requestId={id} /> : null}
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {ticket.covered_by_plan === true ? (
                  <Alert variant="success" title="Covered by your maintenance plan">
                    {ticket.coverage_note ?? 'There is nothing extra to pay for this.'}
                  </Alert>
                ) : ticket.covered_by_plan === false ? (
                  <Alert variant="warning" title="Not covered by your plan">
                    {ticket.coverage_note ??
                      'We will confirm any cost with you before carrying out chargeable work.'}
                  </Alert>
                ) : null}

                {ticket.resolution_summary ? (
                  <Alert variant="success" title="Resolved">
                    {ticket.resolution_summary}
                  </Alert>
                ) : null}

                <Card>
                  <CardHeader title="What you reported" />
                  <CardBody className="space-y-3">
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
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="Messages"
                    description="Add anything else that might help us."
                  />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="support_request"
                      entityId={id}
                      projectId={ticket.project_id}
                      clientId={ticket.client_id}
                      currentUserId={userId}
                      canWriteInternal={false}
                      placeholder="Add a message…"
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader title="Your cover" />
                  <CardBody className="text-[13px]">
                    {plan ? (
                      <>
                        <p className="font-medium">{plan.name}</p>
                        {plan.response_time_hours ? (
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {plan.response_time_hours}-hour response target
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-[var(--text-muted)]">
                        You do not have an active maintenance plan.
                      </p>
                    )}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Progress" />
                  <CardBody>
                    {timeline.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-muted)]">
                        We will update you here as we work on it.
                      </p>
                    ) : (
                      <Timeline
                        entries={timeline.map((entry) => ({
                          id: entry.id,
                          title: entry.summary,
                          timestamp: entry.created_at,
                          tone: 'accent' as const,
                        }))}
                      />
                    )}
                    {ticket.resolved_at ? (
                      <p className="mt-3 text-[12px] text-[var(--text-muted)]">
                        Resolved {formatDateTime(ticket.resolved_at)}
                      </p>
                    ) : null}
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
