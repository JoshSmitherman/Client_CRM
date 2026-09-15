import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen, Download, ExternalLink, Rocket } from 'lucide-react';

import { AcceptanceForm } from '@/components/handover/acceptance-form';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { HANDOVER_DOC_TYPE_LABELS, HANDOVER_STATUS_LABELS, HANDOVER_STATUS_TONES } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/format';
import { requireClient } from '@/lib/auth';
import { canAcceptHandover } from '@/lib/permissions';
import { getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Handover' };

export default async function PortalHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireClient();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();

  const { data: handover } = await supabase
    .from('handovers')
    .select('*')
    .eq('project_id', id)
    .maybeSingle();

  // Nothing is shown until the agency has actually delivered it.
  if (!handover || handover.status === 'draft' || handover.status === 'ready') {
    return (
      <Card>
        <EmptyState
          icon={Rocket}
          title="Not ready yet"
          description="We will let you know as soon as your handover pack is ready to review."
        />
      </Card>
    );
  }

  const [{ data: documents }, { data: acceptances }] = await Promise.all([
    supabase
      .from('handover_documents')
      .select('id, title, doc_type, description, external_url, file_id')
      .eq('handover_id', handover.id)
      .order('position'),
    supabase
      .from('client_acceptances')
      .select('*')
      .eq('project_id', id)
      .order('accepted_at', { ascending: false }),
  ]);

  const accepted = (acceptances ?? [])[0];

  const details = [
    ['Website address', handover.website_url],
    ['Administration address', handover.admin_url],
    ['Platform', handover.cms_platform],
    ['Hosting', handover.hosting_provider],
    ['Domain registrar', handover.domain_registrar],
    ['Domain expires', handover.domain_expiry ? formatDate(handover.domain_expiry) : null],
    ['DNS', handover.dns_provider],
    ['SSL certificate', handover.ssl_provider],
    ['SSL expires', handover.ssl_expiry ? formatDate(handover.ssl_expiry) : null],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  const notes = [
    ['Analytics', handover.analytics_notes],
    ['Search Console', handover.search_console_notes],
    ['Backups', handover.backup_notes],
    ['Security', handover.security_notes],
    ['Licences', handover.licence_notes],
    ['Documentation', handover.documentation_notes],
    ['Training', handover.training_notes],
    ['Maintenance', handover.maintenance_notes],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <>
      <PageHeader
        title="Website handover"
        description="Everything you need to know about your finished website, kept here for as long as you need it."
        breadcrumbs={[
          { label: 'Projects', href: '/portal/projects' },
          { label: project.name, href: `/portal/projects/${id}` },
          { label: 'Handover' },
        ]}
        meta={
          <Badge tone={HANDOVER_STATUS_TONES[handover.status]} dot>
            {HANDOVER_STATUS_LABELS[handover.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {details.length > 0 ? (
            <Card>
              <CardHeader title="Your website" />
              <CardBody>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {details.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[12px] font-medium text-[var(--text-muted)]">{label}</dt>
                      <dd className="mt-0.5 text-[13px] break-words">
                        {value.startsWith('http') ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[var(--accent-text)] hover:underline"
                          >
                            {value.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          </a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          ) : null}

          {notes.length > 0 ? (
            <Card>
              <CardHeader title="How things are set up" />
              <CardBody className="space-y-4">
                {notes.map(([label, value]) => (
                  <div key={label}>
                    <h3 className="text-[12px] font-medium text-[var(--text-muted)]">{label}</h3>
                    <p className="mt-0.5 text-[13px] whitespace-pre-wrap">{value}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Documents and training"
              description="Yours to keep — these stay available here."
            />
            {(documents ?? []).length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nothing here yet"
                description="Guides and training material will appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {(documents ?? []).map((doc) => (
                  <li key={doc.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium">{doc.title}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        {HANDOVER_DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                      </p>
                      {doc.description ? (
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          {doc.description}
                        </p>
                      ) : null}
                    </div>

                    {doc.file_id ? (
                      <a
                        href={`/api/files/${doc.file_id}`}
                        className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        aria-label={`Download ${doc.title}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                    {doc.external_url ? (
                      <a
                        href={doc.external_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                        aria-label={`Open ${doc.title}`}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {accepted ? (
            <Card>
              <CardHeader title="Accepted" />
              <CardBody className="space-y-2">
                <Alert variant="success" title="Thank you">
                  Signed off by {accepted.signature_name} on{' '}
                  {formatDateTime(accepted.accepted_at)}.
                </Alert>
                <p className="text-[12px] text-[var(--text-secondary)]">{accepted.statement}</p>
              </CardBody>
            </Card>
          ) : (
            <AcceptanceForm
              projectId={id}
              handoverId={handover.id}
              canAccept={canAcceptHandover(session.profile.role)}
              defaultName={session.profile.full_name || ''}
            />
          )}
        </div>
      </div>
    </>
  );
}
