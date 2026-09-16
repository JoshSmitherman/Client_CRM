
import { currentUser } from '@/lib/session';
import { supabase } from '@/lib/supabase/client';

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  await currentUser();

  // RLS restricts this to the recipient's own rows, so no ownership check is
  // needed here — a forged id simply matches nothing.
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await currentUser();

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', session.userId)
    .eq('is_read', false);
}

export async function deleteNotificationAction(notificationId: string): Promise<void> {
  await currentUser();

  await supabase.from('notifications').delete().eq('id', notificationId);
}
