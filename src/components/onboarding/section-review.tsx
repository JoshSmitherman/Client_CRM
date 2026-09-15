'use client';

import { Check, RotateCcw, SlashSquare, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  reopenOnboardingSectionAction,
  reviewOnboardingSectionAction,
} from '@/lib/actions/onboarding';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Agency review controls. Requesting changes requires a reason — the same rule
 * the approvals table enforces with a CHECK constraint.
 */
export function SectionReview({
  sectionId,
  status,
}: {
  sectionId: string;
  status: Enums<'onboarding_status'>;
}) {
  const [isPending, startTransition] = useTransition();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setShowFeedback(false);
        setFeedback('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== 'approved' ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(() => reviewOnboardingSectionAction(sectionId, 'approved'))}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Approve
          </Button>
        ) : null}

        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => setShowFeedback((v) => !v)}
          aria-expanded={showFeedback}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Request changes
        </Button>

        {status !== 'not_required' ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => run(() => reviewOnboardingSectionAction(sectionId, 'not_required'))}
            title="Excluded from the completion calculation"
          >
            <SlashSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Not required
          </Button>
        ) : null}

        {status === 'submitted' || status === 'approved' || status === 'not_required' ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => run(() => reopenOnboardingSectionAction(sectionId))}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reopen
          </Button>
        ) : null}
      </div>

      {showFeedback ? (
        <div className="space-y-2">
          <label htmlFor={`feedback-${sectionId}`} className="block text-[12px] font-medium">
            What does the client need to change? <span className="text-[var(--danger)]">*</span>
          </label>
          <textarea
            id={`feedback-${sectionId}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            required
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm"
            placeholder="Be specific — this is sent to the client."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending || !feedback.trim()}
              onClick={() =>
                run(() => reviewOnboardingSectionAction(sectionId, 'needs_changes', feedback))
              }
            >
              Send feedback
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[12px] text-[var(--danger-text)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
