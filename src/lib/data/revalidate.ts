/**
 * "Something changed — re-read what is on screen."
 *
 * With a server this was `revalidatePath`. Here there is no server to ask, so
 * a mutation announces that it succeeded and every live query re-runs. That is
 * blunter than invalidating one cache key, but the alternative is a screen that
 * quietly disagrees with the database after a button is pressed, which is worse
 * than a few extra requests.
 *
 * Queries keep their current data on screen while the refetch is in flight, so
 * this does not make the page flicker.
 */
const listeners = new Set<() => void>();

export function revalidate(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeToRevalidation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
