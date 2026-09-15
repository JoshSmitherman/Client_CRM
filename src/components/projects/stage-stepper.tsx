'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState, useTransition } from 'react';

import { setProjectStageAction } from '@/lib/actions/projects';
import { cn } from '@/lib/utils';

export interface Stage {
  id: string;
  key: string;
  label: string;
  colour: string;
  position: number;
}

/**
 * Horizontal lifecycle stepper on wide screens, a select on narrow ones.
 * Stages come from the database, so renaming or reordering them in Settings is
 * reflected here without a code change.
 */
export function StageStepper({
  projectId,
  stages,
  currentStageId,
  className,
}: {
  projectId: string;
  stages: Stage[];
  currentStageId: string | null;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  function move(stageId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await setProjectStageAction(projectId, stageId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not change the stage.');
      }
    });
  }

  return (
    <div className={className}>
      {/* Narrow screens: a plain select is far easier than a 15-step rail. */}
      <div className="lg:hidden">
        <label htmlFor="stage-select" className="sr-only">
          Project stage
        </label>
        <div className="relative">
          <select
            id="stage-select"
            value={currentStageId ?? ''}
            disabled={isPending}
            onChange={(e) => move(e.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] pr-9 pl-3 text-sm"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.position}. {stage.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Wide screens: the full rail, scrollable rather than squashed. */}
      <ol
        className={cn(
          'scrollbar-thin hidden items-center gap-1 overflow-x-auto pb-1 lg:flex',
          isPending && 'opacity-60',
        )}
        aria-label="Project lifecycle"
      >
        {stages.map((stage, index) => {
          const isCurrent = stage.id === currentStageId;
          const isPast = currentIndex >= 0 && index < currentIndex;

          return (
            <li key={stage.id} className="shrink-0">
              <button
                type="button"
                onClick={() => move(stage.id)}
                disabled={isPending || isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                title={isCurrent ? `Current stage: ${stage.label}` : `Move to ${stage.label}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                  isCurrent
                    ? 'text-white'
                    : isPast
                      ? 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
                )}
                style={isCurrent ? { backgroundColor: stage.colour } : undefined}
              >
                {isPast ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', isCurrent ? 'bg-white' : 'bg-current')}
                    aria-hidden="true"
                  />
                )}
                {stage.label}
              </button>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-[var(--danger-text)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
