import type { Metadata } from 'next';

import { NotificationList, type NotificationRow } from '@/components/notifications/notification-list';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const session = await requireUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, url, is_read, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (notifications ?? []) as NotificationRow[];
  const unread = rows.filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : 'You are up to date.'}
      />

      <Card>
        <CardHeader title="Recent" />
        <NotificationList notifications={rows} />
      </Card>
    </>
  );
}
