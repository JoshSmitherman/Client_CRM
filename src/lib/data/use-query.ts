import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeToRevalidation } from '@/lib/data/revalidate';

export interface QueryState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  /** True while a refetch is in flight but stale data is still on screen. */
  isRefreshing: boolean;
  refetch: () => void;
}

/**
 * Minimal data-fetching hook.
 *
 * Hand-rolled rather than pulling in a query library: the application needs
 * loading state, an error message, refetch on demand, and cancellation of a
 * response that arrives after the inputs changed. That is about forty lines,
 * and a dependency would bring a cache layer nothing here uses.
 *
 * `deps` works like the dependency array of useEffect — list whatever the
 * fetcher closes over.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Guards against a slow response overwriting a newer one.
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (isRefresh: boolean) => {
    const id = ++requestId.current;

    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'Something went wrong loading this.');
    } finally {
      if (id === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void run(false);
    // The caller declares what the fetcher depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => {
    void run(true);
  }, [run]);

  // Re-read after a mutation reports success, so a screen never disagrees with
  // the database because a button was pressed somewhere else on the page.
  useEffect(() => subscribeToRevalidation(refetch), [refetch]);

  return { data, error, isLoading, isRefreshing, refetch };
}
