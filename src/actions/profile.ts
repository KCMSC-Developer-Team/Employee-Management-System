'use server';

import { revalidatePath } from 'next/cache';
import { requireRole, requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { fail, ok, str } from '@/lib/form';
import { notify, userIdsWithRoles } from '@/lib/notify';
import { ADMIN_KEYS, EMPLOYEE_KEYS, FIELD_BY_KEY } from '@/lib/profile-fields';
import { isDeveloper } from '@/lib/roles';
import type { FormState } from '@/lib/types';

async function mergeProfile(userId: string, patch: Record<string, string>) {
  await query(
    `insert into profiles (user_id, data) values ($1, $2::jsonb)
     on conflict (user_id) do update set data = profiles.data || excluded.data, updated_at = now()`,
    [userId, JSON.stringify(patch)],
  );
}

async function currentData(userId: string): Promise<Record<string, string>> {
  const row = await one<{ data: Record<string, string> }>('select data from profiles where user_id = $1', [userId]);
  return row?.data ?? {};
}

const cap = (key: string) => (FIELD_BY_KEY[key]?.type === 'textarea' ? 1000 : 200);

/* Employee edits own profile → waits for approval (Developers save directly). */
export async function submitProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = await currentData(user.id);

  const changed: Record<string, string> = {};
  for (const key of EMPLOYEE_KEYS) {
    if (!fd.has(key)) continue;
    const value = str(fd, key, cap(key));
    if (value !== (current[key] ?? '')) changed[key] = value;
  }
  if (Object.keys(changed).length === 0) return fail('You have not changed anything.');

  if (isDeveloper(user.roles)) {
    await mergeProfile(user.id, changed);
    revalidatePath('/profile');
    return ok('Saved. (Developer changes need no approval.)');
  }

  await query(`delete from profile_edits where user_id = $1 and status = 'pending'`, [user.id]);
  await query('insert into profile_edits (user_id, data) values ($1, $2::jsonb)', [user.id, JSON.stringify(changed)]);

  const approvers = await userIdsWithRoles(['it', 'authority'], user.id);
  await notify(approvers, {
    title: 'Profile change waiting for approval',
    body: `${user.name} changed ${Object.keys(changed).length} field(s) in their profile.`,
    url: '/approvals',
  });
  revalidatePath('/profile');
  revalidatePath('/approvals');
  return ok('Your changes were sent for approval. You will be notified when they are reviewed.');
}

export async function reviewEdit(_prev: FormState, fd: FormData): Promise<FormState> {
  const actor = await requireRole('it', 'authority');
  const id = str(fd, 'id', 60);
  const decision = str(fd, 'decision', 10);
  const note = str(fd, 'note', 300);
  if (decision !== 'approve' && decision !== 'reject') return fail('Choose approve or reject.');

  const edit = await one<{ id: string; user_id: string; data: Record<string, string> }>(
    `select id, user_id, data from profile_edits where id = $1 and status = 'pending'`,
    [id],
  );
  if (!edit) return fail('This request was already reviewed.');
  if (edit.user_id === actor.id && !isDeveloper(actor.roles)) return fail('You cannot approve your own changes.');

  if (decision === 'approve') {
    const safe = Object.fromEntries(Object.entries(edit.data).filter(([k]) => EMPLOYEE_KEYS.includes(k)));
    await mergeProfile(edit.user_id, safe);
  }
  await query(
    `update profile_edits set status = $2, reviewed_by = $3, review_note = $4, reviewed_at = now() where id = $1`,
    [id, decision === 'approve' ? 'approved' : 'rejected', actor.id, note || null],
  );
  await notify([edit.user_id], {
    title: decision === 'approve' ? 'Your profile changes were approved' : 'Your profile changes were rejected',
    body: decision === 'approve' ? 'The new details are now saved in your profile.' : note || 'Please review and submit again.',
    url: '/profile',
  });
  revalidatePath('/approvals');
  revalidatePath('/profile');
  return ok(decision === 'approve' ? 'Approved.' : 'Rejected.');
}

/* Administration-only fields: ID No., joining date, position, supervisor, observations. */
export async function saveAdminFields(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole('it', 'authority');
  const patch: Record<string, string> = {};
  for (const key of ADMIN_KEYS) patch[key] = str(fd, key, cap(key));
  await mergeProfile(userId, patch);
  revalidatePath(`/employees/${userId}`);
  return ok('Saved.');
}

/* Anyone can correct their own name. It is saved straight away and IT / Authority are told. */
export async function changeMyName(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(fd, 'name', 120).replace(/\s+/g, ' ');
  if (name.length < 2) return fail('Enter your full name.');
  if (name === user.name) return fail('That is already your name.');
  await query('update users set name = $2 where id = $1', [user.id, name]);
  await notify(await userIdsWithRoles(['it', 'authority'], user.id), {
    title: 'An employee changed their name',
    body: `${user.name} is now recorded as ${name}.`,
    url: '/employees',
  });
  revalidatePath('/', 'layout');
  revalidatePath('/profile');
  return ok('Your name has been updated.');
}

/* Profile picture (already cropped in the browser to a small square JPEG). */
export async function savePhoto(dataUrl: string): Promise<FormState> {
  const user = await requireUser();
  if (typeof dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    return fail('This image could not be used.');
  }
  if (dataUrl.length > 400_000) return fail('The image is too large. Please choose a smaller one.');
  await query('update users set photo = $2, photo_version = photo_version + 1 where id = $1', [user.id, dataUrl]);
  revalidatePath('/', 'layout');
  return ok('Photo updated.');
}

export async function removePhoto(): Promise<FormState> {
  const user = await requireUser();
  await query('update users set photo = null, photo_version = photo_version + 1 where id = $1', [user.id]);
  revalidatePath('/', 'layout');
  return ok('Photo removed.');
}
