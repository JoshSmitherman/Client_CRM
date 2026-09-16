import { useEffect } from 'react';

import { brand } from '@/config/brand';

/**
 * Sets the browser tab title. A single-page app has no per-route document, so
 * this stands in for Next's metadata export.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${brand.name}` : `${brand.name} — ${brand.productName}`;
  }, [title]);
}
