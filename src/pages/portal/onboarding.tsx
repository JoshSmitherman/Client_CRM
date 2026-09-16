import { ChevronRight, ClipboardList } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress';
import { ONBOARDING_STATUS_LABELS, ONBOARDING_STATUS_TONES } from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { SECTION_BY_KEY } from '@/lib/onboarding-template';
import { getOnboarding } from '@/lib/queries/onboarding';
import { getProject } from '@/lib/queries/projects';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const [project, onboarding] = await Promise.all([getProject(id), getOnboarding(id)]);
  return project ? { project, onboarding } : null;
}

export function PortalOnboardingPage() {
  useDocumentTitle('Onboarding');
  const { id = '' } = useParams();
  const query = useQuery(() => load(id), [id]);

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data) return <NotFoundPage />;
        const { project, onboarding } = data;

        if (onboarding.sections.length === 0) {
          return (
            <Card>
              <EmptyState
                icon={ClipboardList}
                title="Nothing to fill in yet"
                description="We have not set up an onboarding questionnaire for this project."
              />
            </Card>
          );
        }

        const nextSection = onboarding.sections.find((s) =>
          ['not_started', 'in_progress', 'needs_changes'].includes(s.status),
        );

        return (
          <>
            <PageHeader
              title="Onboarding"
              description="Tell us about your business and what you need, one section at a time. You can save and come back whenever you like."
              breadcrumbs={[
                { label: 'Projects', href: '/portal/projects' },
                { label: project.name, href: `/portal/projects/${id}` },
                { label: 'Onboarding' },
              ]}
            />

            <Card className="mb-4">
              <CardBody className="space-y-3">
                <ProgressBar
                  value={onboarding.completion}
                  label={`${onboarding.approved} of ${onboarding.countedTotal} sections complete`}
                  size="lg"
                />
                {onboarding.needsChanges > 0 ? (
                  <p className="text-[13px] text-[var(--warning-text)]">
                    {onboarding.needsChanges} section{onboarding.needsChanges === 1 ? '' : 's'}{' '}
                    need{onboarding.needsChanges === 1 ? 's' : ''} a small change — look for the
                    amber labels below.
                  </p>
                ) : null}
                {nextSection ? (
                  <Link
                    to={`/portal/projects/${id}/onboarding/${nextSection.key}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Continue with {nextSection.title}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <p className="text-[13px] text-[var(--success-text)]">
                    All done — thank you. We will be in touch if we need anything else.
                  </p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Sections" />
              <ul className="divide-y divide-[var(--border-subtle)]">
                {onboarding.sections.map((section) => {
                  const definition = SECTION_BY_KEY.get(section.key);
                  const notRequired = section.status === 'not_required';

                  return (
                    <li key={section.id}>
                      <Link
                        to={`/portal/projects/${id}/onboarding/${section.key}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <span className="w-6 shrink-0 text-[13px] text-[var(--text-muted)] tabular-nums">
                          {section.position}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium">{section.title}</span>
                          <span className="block text-[12px] text-[var(--text-muted)]">
                            {notRequired
                              ? 'Not needed for your project'
                              : section.missingRequired.length > 0
                                ? `Still needed: ${section.missingRequired.slice(0, 3).join(', ')}${section.missingRequired.length > 3 ? '…' : ''}`
                                : (definition?.description ?? '')}
                          </span>
                        </span>

                        <Badge tone={ONBOARDING_STATUS_TONES[section.status]} dot>
                          {ONBOARDING_STATUS_LABELS[section.status]}
                        </Badge>

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        );
      }}
    </QueryBoundary>
  );
}
