import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

import { QueryBoundary } from '@/components/routing/page-state';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@/lib/data/use-query';
import { formatRelative } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';
import { truncate } from '@/lib/utils';

/** Where each kind of comment lives in the portal. */
const LINKS: Record<string, (entityId: string, projectId: string | null) => string | null> = {
  project: (_id, projectId) => (projectId ? `/portal/projects/${projectId}` : null),
  change_request: (entityId) => `/portal/requests/${entityId}`,
  support_request: (entityId) => `/portal/support/${entityId}`,
  website_page: (entityId, projectId) =>
    projectId ? `/portal/projects/${projectId}/content/${entityId}` : null,
  onboarding_section: (_id, projectId) =>
    projectId ? `/portal/projects/${projectId}/onboarding` : null,
};

async function load() {
  // Internal notes are excluded by the SELECT policy, so nothing is filtered
  // here — a client simply cannot see them.
  const { data } = await supabase
    .from('comments')
    .select(
      'id, body, created_at, entity_type, entity_id, project_id, author:users!comments_author_id_fkey ( full_name, role )',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  return data ?? [];
}

export function PortalMessagesPage() {
  useDocumentTitle('Messages');
  const query = useQuery(load, []);

  return (
    <>
      <PageHeader title="Messages" description="Every conversation with us, in one place." />

      <QueryBoundary query={query}>
        {(rows) => (
          <Card>
            <CardHeader title="Recent" description={`${rows.length} messages`} />
            {rows.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Comments you and the team leave on projects, requests and pages appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {rows.map((comment) => {
                  const author = comment.author as unknown as {
                    full_name: string;
                    role: string;
                  } | null;
                  const href = LINKS[comment.entity_type]?.(
                    comment.entity_id,
                    comment.project_id,
                  );

                  const body = (
                    <>
                      <p className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="font-medium text-[var(--text-primary)]">
                          {author?.full_name ?? 'Unknown'}
                        </span>
                        <span className="text-[var(--text-muted)]">
                          {formatRelative(comment.created_at)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
                        {truncate(comment.body, 200)}
                      </p>
                    </>
                  );

                  return (
                    <li key={comment.id}>
                      {href ? (
                        <Link
                          to={href}
                          className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          <Avatar name={author?.full_name ?? 'Unknown'} size="sm" />
                          <div className="min-w-0 flex-1">{body}</div>
                        </Link>
                      ) : (
                        <div className="flex gap-3 px-5 py-3.5">
                          <Avatar name={author?.full_name ?? 'Unknown'} size="sm" />
                          <div className="min-w-0 flex-1">{body}</div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </QueryBoundary>
    </>
  );
}
