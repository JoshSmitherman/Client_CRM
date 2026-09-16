import {
  NotificationList,
  type NotificationRow,
} from '@/components/notifications/notification-list';
import { QueryBoundary } from '@/components/routing/page-state';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

async function load(userId: string) {
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, url, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (data ?? []) as NotificationRow[];
}

export function NotificationsPage() {
  useDocumentTitle('Notifications');
  const { userId } = useAuth();
  const query = useQuery(() => load(userId ?? ''), [userId]);

  const unread = query.data?.filter((n) => !n.is_read).length ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are up to date.'}
      />

      <Card>
        <CardHeader title="Recent" />
        <QueryBoundary query={query}>
          {(rows) => <NotificationList notifications={rows} />}
        </QueryBoundary>
      </Card>
    </>
  );
}
