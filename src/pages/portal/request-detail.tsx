import { ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { CancelRequestButton } from '@/components/change-requests/cancel-request';
import { QuoteDecision } from '@/components/change-requests/quote-decision';
import type { QuoteRow } from '@/components/change-requests/quote-panel';
import { CommentThread } from '@/components/comments/comment-thread';
import { FileGrid, type FileRow } from '@/components/files/file-grid';
import { QueryBoundary } from '@/components/routing/page-state';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { PageHeader } from '@/components/ui/page-header';
import { Timeline } from '@/components/ui/timeline';
import { useAuth } from '@/lib/auth-context';
import {
  BILLING_TREATMENT_LABELS,
  BILLING_TREATMENT_TONES,
  CHANGE_CATEGORY_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  PRIORITY_LABELS,
  QUOTE_DECISION_LABELS,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import {
  getChangeRequest,
  getChangeRequestAttachments,
  getChangeRequestQuotes,
  getChangeRequestTimeline,
} from '@/lib/queries/change-requests';
import { getComments } from '@/lib/queries/comments';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const request = await getChangeRequest(id);
  if (!request) return null;

  const [quotes, timeline, attachments, comments] = await Promise.all([
    getChangeRequestQuotes(id),
    getChangeRequestTimeline(id),
    getChangeRequestAttachments(id),
    getComments({ entityType: 'change_request', entityId: id }),
  ]);

  return { request, quotes, timeline, attachments, comments };
}

export function PortalRequestDetailPage() {
  const { id = '' } = useParams();
  const { userId } = useAuth();
  const query = useQuery(() => load(id), [id]);

  useDocumentTitle(query.data?.request.title ?? 'Change request');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data || !userId) return <NotFoundPage />;
        const { request, timeline, attachments, comments } = data;

        const rows = data.quotes as unknown as QuoteRow[];
        const pendingQuote = rows.find((q) => q.decision === 'pending');
        const project = request.projects as unknown as { id: string; name: string };
        const canCancel = request.status === 'submitted';

        return (
          <>
            <PageHeader
              title={request.title}
              breadcrumbs={[
                { label: 'Requests', href: '/portal/requests' },
                { label: request.reference },
              ]}
              meta={
                <>
                  <Badge tone={CHANGE_STATUS_TONES[request.status]} dot>
                    {CHANGE_STATUS_LABELS[request.status]}
                  </Badge>
                  {request.billing_treatment ? (
                    <Badge tone={BILLING_TREATMENT_TONES[request.billing_treatment]}>
                      {BILLING_TREATMENT_LABELS[request.billing_treatment]}
                    </Badge>
                  ) : null}
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {project.name} · {CHANGE_CATEGORY_LABELS[request.category]} · raised{' '}
                    {formatDate(request.submitted_at)}
                  </span>
                </>
              }
              actions={canCancel ? <CancelRequestButton requestId={id} /> : null}
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {pendingQuote ? <QuoteDecision requestId={id} quote={pendingQuote} /> : null}

                {request.status === 'more_information_required' ? (
                  <Alert variant="warning" title="We need a little more information">
                    {request.client_notes ??
                      'Please add a comment below with the extra detail we have asked for.'}
                  </Alert>
                ) : null}

                {request.status === 'rejected' && request.rejected_reason ? (
                  <Alert variant="danger" title="This request was declined">
                    {request.rejected_reason}
                  </Alert>
                ) : null}

                <Card>
                  <CardHeader title="Your request" />
                  <CardBody className="space-y-4">
                    <p className="text-[13px] whitespace-pre-wrap">{request.description}</p>

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
                      <a
                        href={request.affected_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[13px] break-all text-[var(--accent-text)] hover:underline"
                      >
                        {request.affected_url}
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    ) : null}

                    {request.client_notes &&
                    request.status !== 'more_information_required' ? (
                      <div className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2">
                        <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                          Update from us
                        </h3>
                        <p className="mt-0.5 text-[13px]">{request.client_notes}</p>
                      </div>
                    ) : null}
                  </CardBody>
                </Card>

                {attachments.length > 0 ? (
                  <Card>
                    <CardHeader title="Attachments" />
                    <FileGrid
                      files={attachments as unknown as FileRow[]}
                      canApprove={false}
                      currentUserId={userId}
                      isManager={false}
                    />
                  </Card>
                ) : null}

                <Card>
                  <CardHeader
                    title="Messages"
                    description="Ask us anything about this request."
                  />
                  <CardBody>
                    <CommentThread
                      comments={comments}
                      entityType="change_request"
                      entityId={id}
                      projectId={request.project_id}
                      clientId={request.client_id}
                      currentUserId={userId}
                      canWriteInternal={false}
                      placeholder="Add a message about this request…"
                    />
                  </CardBody>
                </Card>
              </div>

              <div className="space-y-4">
                {rows.length > 0 ? (
                  <Card>
                    <CardHeader title="Quotations" />
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {rows.map((quote) => (
                        <li key={quote.id} className="px-5 py-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[14px] font-semibold tabular-nums">
                              {formatCurrency(quote.quoted_cost)}
                            </span>
                            <Badge
                              tone={
                                quote.decision === 'approved'
                                  ? 'success'
                                  : quote.decision === 'rejected'
                                    ? 'danger'
                                    : quote.decision === 'pending'
                                      ? 'warning'
                                      : 'info'
                              }
                            >
                              {QUOTE_DECISION_LABELS[quote.decision]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                            {formatDateTime(quote.offered_at)}
                          </p>
                          {quote.decision_notes ? (
                            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                              {quote.decision_notes}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader title="Details" />
                  <CardBody className="space-y-2.5 text-[13px]">
                    <DetailRow label="Priority">{PRIORITY_LABELS[request.priority]}</DetailRow>
                    <DetailRow label="Expected completion">
                      {request.estimated_completion_date
                        ? formatDate(request.estimated_completion_date)
                        : 'To be confirmed'}
                    </DetailRow>
                    <DetailRow label="Completed">
                      {request.completed_at ? formatDate(request.completed_at) : '—'}
                    </DetailRow>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Progress" />
                  <CardBody>
                    {timeline.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-muted)]">Nothing recorded yet.</p>
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
