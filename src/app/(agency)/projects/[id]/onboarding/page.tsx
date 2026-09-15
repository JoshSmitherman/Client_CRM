import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardList } from 'lucide-react';

import { SectionReview } from '@/components/onboarding/section-review';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress';
import { ONBOARDING_STATUS_LABELS, ONBOARDING_STATUS_TONES } from '@/lib/constants';
import { formatRelative } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import { SECTION_BY_KEY } from '@/lib/onboarding-template';
import { getOnboarding } from '@/lib/queries/onboarding';
import { getProject } from '@/lib/queries/projects';

export default async function ProjectOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const onboarding = await getOnboarding(id);

  if (onboarding.sections.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title="No onboarding questionnaire"
          description="This project was created without one. Create the project again with onboarding enabled, or add sections from Settings."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Onboarding progress"
          description={`${onboarding.approved} of ${onboarding.countedTotal} required sections approved. Sections marked "not required" are excluded.`}
        />
        <CardBody className="space-y-3">
          <ProgressBar value={onboarding.completion} label="Onboarding complete" size="lg" />
          <div className="flex flex-wrap gap-2">
            {onboarding.awaitingReview > 0 ? (
              <Badge tone="accent">{onboarding.awaitingReview} awaiting review</Badge>
            ) : null}
            {onboarding.needsChanges > 0 ? (
              <Badge tone="warning">{onboarding.needsChanges} with the client</Badge>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <ul className="space-y-3">
        {onboarding.sections.map((section) => {
          const definition = SECTION_BY_KEY.get(section.key);
          const responses = (section.responses ?? {}) as Record<string, unknown>;
          const answered = definition
            ? definition.fields.filter((f) => {
                const value = responses[f.key];
                return f.type === 'checkbox'
                  ? value === true
                  : value !== undefined && String(value ?? '').trim() !== '';
              }).length
            : 0;

          return (
            <li key={section.id}>
              <Card>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[var(--text-muted)]">{section.position}.</span>
                      {section.title}
                      <Badge tone={ONBOARDING_STATUS_TONES[section.status]} dot>
                        {ONBOARDING_STATUS_LABELS[section.status]}
                      </Badge>
                    </span>
                  }
                  description={
                    definition
                      ? `${answered} of ${definition.fields.length} answers provided${
                          section.submitted_at
                            ? ` · submitted ${formatRelative(section.submitted_at)}`
                            : ''
                        }`
                      : undefined
                  }
                />

                <CardBody className="space-y-4">
                  {section.missingRequired.length > 0 && section.status !== 'not_required' ? (
                    <p className="text-[12px] text-[var(--text-muted)]">
                      Still needed: {section.missingRequired.join(', ')}
                    </p>
                  ) : null}

                  {section.agency_feedback ? (
                    <p className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
                      <span className="font-medium">Your feedback:</span> {section.agency_feedback}
                    </p>
                  ) : null}

                  {/* A summary of the answers, so a reviewer does not have to
                      open a separate screen to decide. */}
                  {definition && answered > 0 ? (
                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {definition.fields
                        .filter((f) => {
                          const value = responses[f.key];
                          return f.type === 'checkbox'
                            ? value === true
                            : value !== undefined && String(value ?? '').trim() !== '';
                        })
                        .map((f) => (
                          <div key={f.key} className={f.wide ? 'sm:col-span-2' : undefined}>
                            <dt className="text-[12px] font-medium text-[var(--text-muted)]">
                              {f.label}
                            </dt>
                            <dd className="text-[13px] whitespace-pre-wrap">
                              {f.type === 'checkbox'
                                ? 'Confirmed'
                                : f.type === 'select'
                                  ? (f.options?.find((o) => o.value === responses[f.key])?.label ??
                                    String(responses[f.key]))
                                  : String(responses[f.key])}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  ) : (
                    <p className="text-[13px] text-[var(--text-muted)]">
                      The client has not answered anything in this section yet.
                    </p>
                  )}

                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <SectionReview sectionId={section.id} status={section.status} />
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>

      <p className="text-[12px] text-[var(--text-muted)]">
        The client fills these in from{' '}
        <Link href={`/portal/projects/${id}/onboarding`} className="underline">
          their portal
        </Link>
        .
      </p>
    </div>
  );
}
