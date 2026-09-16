import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { isAgency } from '@/lib/permissions';
import { useDocumentTitle } from '@/lib/use-document-title';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  const { profile } = useAuth();

  const home = profile ? (isAgency(profile.role) ? '/dashboard' : '/portal') : '/login';

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">We could not find that page</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        The link may be out of date, or the item may have been removed.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link to={home}>Back to safety</Link>
        </Button>
      </div>
    </div>
  );
}
