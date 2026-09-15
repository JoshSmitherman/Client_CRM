'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  // RLS restricts this to the recipient's own rows, so no ownership check is
  // needed here — a forged id simply matches nothing.
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  revalidatePath('/', 'layout');
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await requireUser();
  const supabase = await createClient();

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', session.userId)
    .eq('is_read', false);

  revalidatePath('/', 'layout');
}

export async function deleteNotificationAction(notificationId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  await supabase.from('notifications').delete().eq('id', notificationId);

  revalidatePath('/', 'layout');
}
