import { Download } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { signedDownloadUrl } from '@/lib/download';

/**
 * Fetches a short-lived signed URL and opens it.
 *
 * The link is minted on click rather than rendered into the page, so a URL
 * never outlives the moment someone asked for the file.
 */
export function DownloadButton({ fileId, label }: { fileId: string; label: string }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-end">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={isPending}
        aria-label={`Download ${label}`}
        onClick={async () => {
          setIsPending(true);
          setError(null);
          try {
            window.location.href = await signedDownloadUrl(fileId);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not download that.');
          } finally {
            setIsPending(false);
          }
        }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
      </Button>
      {error ? (
        <span role="alert" className="text-[11px] text-[var(--danger-text)]">
          {error}
        </span>
      ) : null}
    </span>
  );
}
