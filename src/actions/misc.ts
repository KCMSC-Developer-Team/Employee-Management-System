'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, str } from '@/lib/form';
import { notify } from '@/lib/notify';
import type { FormState } from '@/lib/types';

/* Objections — added by an Authority, readable only by that employee (and a Developer). */
export async function addObjection(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireRole('authority');
  const subject = str(fd, 'subject', 150);
  const body = str(fd, 'body', 3000);
  if (!subject || !body) return fail('Write both a subject and the details.');
  await query('insert into objections (user_id, author_id, subject, body) values ($1,$2,$3,$4)', [
    userId,
    actor.id,
    subject,
    body,
  ]);
  await notify([userId], {
    title: 'A new objection was added for you',
    body: `Subject: ${subject}. Open “My objections” to read it.`,
    url: '/objections',
  });
  revalidatePath(`/employees/${userId}`);
  return ok('Objection added. The employee has been notified.');
}

/* Notifications */
export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await query('update notifications set read_at = now() where user_id = $1 and read_at is null', [user.id]);
  revalidatePath('/', 'layout');
}

export async function savePrefs(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const push = fd.get('push') === 'on';
  const email = fd.get('email') === 'on';
  if (!push && !email) return fail('You must keep at least one of browser or e-mail notifications switched on.');
  await query('update users set notif_push = $2, notif_email = $3 where id = $1', [user.id, push, email]);
  revalidatePath('/settings');
  return ok('Notification settings saved.');
}
