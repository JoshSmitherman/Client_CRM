import { Check, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { reviewPageAction } from '@/lib/actions/content';
import { revalidate } from '@/lib/data/revalidate';
import type { Enums } from '@/lib/supabase/database.types';

export function PageReview({
  pageId,
  status,
}: {
  pageId: string;
  status: Enums<'page_status'>;
}) {
  const [isPending, startTransition] = useTransition();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(decision: 'approved' | 'needs_changes', reason?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await reviewPageAction(pageId, decision, reason);
        revalidate();
        setShowFeedback(false);
        setFeedback('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  return (
    <Card>
      <CardHeader title="Review" description="Approve the copy, or send it back with notes." />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {status !== 'approved' ? (
            <Button size="sm" disabled={isPending} onClick={() => run('approved')}>
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
        </div>

        {showFeedback ? (
          <div className="space-y-2">
            <label htmlFor={`page-feedback-${pageId}`} className="block text-[12px] font-medium">
              What needs to change? <span className="text-[var(--danger)]">*</span>
            </label>
            <textarea
              id={`page-feedback-${pageId}`}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              required
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-2 text-sm"
              placeholder="Be specific — this goes straight to the client."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isPending || !feedback.trim()}
                onClick={() => run('needs_changes', feedback)}
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
      </CardBody>
    </Card>
  );
}
