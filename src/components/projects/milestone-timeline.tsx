import { CheckCircle2, Circle, Flag } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, isOverdue } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface Milestone {
  id: string;
  title: string;
  target_date: string | null;
  completed_at: string | null;
  owner_side?: string;
}

export function MilestoneTimeline({
  milestones,
  emptyMessage = 'No milestones have been set for this project yet.',
}: {
  milestones: Milestone[];
  emptyMessage?: string;
}) {
  if (milestones.length === 0) {
    return <EmptyState icon={Flag} title="No milestones" description={emptyMessage} />;
  }

  return (
    <ol className="space-y-0">
      {milestones.map((milestone, index) => {
        const complete = Boolean(milestone.completed_at);
        const late = !complete && isOverdue(milestone.target_date);

        return (
          <li key={milestone.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < milestones.length - 1 ? (
              <span
                className="absolute top-5 left-[9px] h-full w-px bg-[var(--border-subtle)]"
                aria-hidden="true"
              />
            ) : null}

            {complete ? (
              <CheckCircle2
                className="relative z-10 mt-0.5 h-[19px] w-[19px] shrink-0 text-[var(--success)]"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className={cn(
                  'relative z-10 mt-0.5 h-[19px] w-[19px] shrink-0',
                  late ? 'text-[var(--danger)]' : 'text-[var(--border-strong)]',
                )}
                aria-hidden="true"
              />
            )}

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[13px] font-medium',
                  complete && 'text-[var(--text-muted)] line-through',
                )}
              >
                {milestone.title}
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                {complete ? (
                  <>Completed {formatDate(milestone.completed_at)}</>
                ) : milestone.target_date ? (
                  <span className={late ? 'font-medium text-[var(--danger-text)]' : ''}>
                    {late ? 'Overdue — was due ' : 'Due '}
                    {formatDate(milestone.target_date)}
                  </span>
                ) : (
                  'No target date'
                )}
                {milestone.owner_side === 'client' ? ' · Client' : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
