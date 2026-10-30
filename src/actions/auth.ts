'use server';

import { redirect } from 'next/navigation';
import { consumeToken, createSession, destroySession, hashPassword, peekToken, requireUser, verifyPassword } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { DEVELOPER_EMAIL } from '@/lib/config';
import { fail, go, ok, str } from '@/lib/form';
import { sendSetPasswordLinks } from '@/lib/invite';
import type { FormState } from '@/lib/types';

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 200).toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (!email || !password) return fail('Enter your e-mail and password.');

  const user = await one<{ id: string; password_hash: string | null }>(
    'select id, password_hash from users where lower(email) = $1 and active = true',
    [email],
  );
  const good = await verifyPassword(password, user?.password_hash);
  if (!user || !good) return fail('E-mail or password is not correct.');

  await createSession(user.id);
  return go('/dashboard');
}

/**
 * First-time setup: creates the built-in Developer account (DEVELOPER_EMAIL) and e-mails a
 * set-password link to that address. Works only while that account does not exist yet, and the
 * link is only ever sent to the mailbox itself — so nobody else can claim the account.
 */
export async function setupDeveloper(_prev: FormState, _fd: FormData): Promise<FormState> {
  const email = DEVELOPER_EMAIL;
  const existing = await one('select 1 from users where lower(email) = $1', [email]);
  if (existing) return fail('The Developer account already exists. Please sign in, or use “Forgot password?”.');

  const created = await one<{ id: string }>(
    `insert into users (email, name, designation, roles) values ($1, 'Developer', 'Developer', ARRAY['developer']) returning id`,
    [email],
  );
  if (!created) return fail('Could not create the account.');
  await query('insert into profiles (user_id, data) values ($1, $2::jsonb)', [created.id, '{}']);

  const r = await sendSetPasswordLinks([{ id: created.id, email, name: 'Developer' }], 'invite');
  if (!r.ok) {
    await query('delete from users where id = $1', [created.id]); // let them try again once e-mail works
    return fail(`The e-mail could not be sent (${r.error}). Check RESEND_API_KEY and EMAIL_FROM, then try again.`);
  }
  return ok(`A link to choose your password was sent to ${email}. It works for 3 days.`);
}

export async function logout() {
  await destroySession();
  redirect('/login');
}

export async function forgotPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 200).toLowerCase();
  const generic = ok('If this e-mail belongs to an account, a reset link has been sent. Please check your inbox.');
  if (!email) return fail('Enter your e-mail address.');
  const user = await one<{ id: string; email: string; name: string }>(
    'select id, email, name from users where lower(email) = $1 and active = true',
    [email],
  );
  if (user) await sendSetPasswordLinks([user], 'reset');
  return generic;
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 'token', 200);
  const pw = String(fd.get('password') ?? '');
  const confirm = String(fd.get('confirm') ?? '');
  if (pw.length < 8) return fail('Password must be at least 8 characters.');
  if (pw !== confirm) return fail('The two passwords do not match.');
  const userId = await peekToken(token);
  if (!userId) return fail('This link has expired or was already used. Please ask for a new one.');
  await query('update users set password_hash = $2 where id = $1', [userId, await hashPassword(pw)]);
  await consumeToken(token); // only used up once the new password is safely saved
  return go('/login?done=1');
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(fd.get('current') ?? '');
  const pw = String(fd.get('password') ?? '');
  const confirm = String(fd.get('confirm') ?? '');
  if (pw.length < 8) return fail('New password must be at least 8 characters.');
  if (pw !== confirm) return fail('The two new passwords do not match.');
  const row = await one<{ password_hash: string | null }>('select password_hash from users where id = $1', [user.id]);
  if (!(await verifyPassword(current, row?.password_hash))) return fail('Your current password is not correct.');
  await query('update users set password_hash = $2 where id = $1', [user.id, await hashPassword(pw)]);
  return ok('Password changed.');
}

export async function emailMyResetLink(_prev: FormState, _fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = await sendSetPasswordLinks([{ id: user.id, email: user.email, name: user.name }], 'reset');
  return r.ok ? ok(`A reset link was sent to ${user.email}.`) : fail('The e-mail could not be sent. Please try again later.');
}
