import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';

const COMPONENT_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  planning: 'Planning',
  content: 'Content',
  design: 'Design',
  development: 'Development',
  qa: 'QA',
  handover: 'Handover',
};

const ORDER = ['onboarding', 'planning', 'content', 'design', 'development', 'qa', 'handover'];

/**
 * Per-component progress, computed in the database by
 * calculate_project_progress(). Components with nothing to measure are shown as
 * "not started" rather than 0%, because an empty QA list is not the same as QA
 * that has failed to progress.
 */
export function ProgressBreakdown({
  progress,
  overall,
}: {
  progress: Record<string, number | null> | null;
  overall: number;
}) {
  return (
    <Card>
      <CardHeader title="Progress" description="Calculated from the work recorded in each area." />
      <CardBody className="space-y-3">
        {ORDER.map((key) => {
          const value = progress?.[key];
          return (
            <div key={key}>
              {value === null || value === undefined ? (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                    {COMPONENT_LABELS[key]}
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)]">Not started</span>
                </div>
              ) : (
                <ProgressBar value={value} label={COMPONENT_LABELS[key]} size="sm" />
              )}
            </div>
          );
        })}

        <div className="border-t border-[var(--border-subtle)] pt-3">
          <ProgressBar value={overall} label="Overall project" size="lg" />
        </div>
      </CardBody>
    </Card>
  );
}
