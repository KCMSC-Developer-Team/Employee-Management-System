'use server';

import { redirect } from 'next/navigation';
import { consumeToken, createSession, destroySession, hashPassword, peekToken, requireUser, verifyPassword } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { DEVELOPER_EMAIL } from '@/lib/config';
import { fail, go, ok, str } from '@/lib/form';
import { sendSetPasswordLinks } from '@/lib/invite';
import { emailHtml, sendEmail } from '@/lib/mail';
import { appUrl, isEmail } from '@/lib/utils';
import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/lib/types';

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const identifier = str(fd, 'email', 200).toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (!identifier || !password) return fail('Enter your e-mail or ID number and password.');

  const user = await one<{ id: string; password_hash: string | null }>(
    'select id, password_hash from users where (lower(email) = $1 or id_no = $1) and active = true',
    [identifier],
  );
  const good = await verifyPassword(password, user?.password_hash);
  if (!user || !good) return fail('E-mail/ID or password is not correct.');

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
  if (!pw) return fail('Enter a password.');
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
  if (!pw) return fail('Enter a new password.');
  if (pw !== confirm) return fail('The two new passwords do not match.');
  const row = await one<{ password_hash: string | null }>('select password_hash from users where id = $1', [user.id]);
  if (!(await verifyPassword(current, row?.password_hash))) return fail('Your current password is not correct.');
  await query('update users set password_hash = $2 where id = $1', [user.id, await hashPassword(pw)]);
  return ok('Password changed.');
}

export async function emailMyResetLink(_prev: FormState, _fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!user.email) return fail('This account has no e-mail address. Ask an IT Technician to add one, or contact them to reset your password.');
  const r = await sendSetPasswordLinks([{ id: user.id, email: user.email, name: user.name }], 'reset');
  return r.ok ? ok(`A reset link was sent to ${user.email}.`) : fail('The e-mail could not be sent. Please try again later.');
}

export async function requestEmailChange(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const email = str(fd, 'email', 200).toLowerCase();
  if (!isEmail(email)) return fail('Enter a valid e-mail address.');
  if (email === user.email?.toLowerCase()) return fail('That is already your e-mail address.');

  const taken = await one('select 1 from users where lower(email) = $1 and id <> $2', [email, user.id]);
  if (taken) return fail('That e-mail address is already linked to another account.');

  const raw = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  await query('delete from email_change_tokens where user_id = $1 or expires_at <= now()', [user.id]);
  await query(
    `insert into email_change_tokens (token_hash, user_id, email, expires_at)
     values ($1, $2, $3, now() + interval '1 hour')`,
    [tokenHash, user.id, email],
  );

  const link = `${appUrl()}/verify-email?token=${raw}`;
  const result = await sendEmail({
    to: email,
    subject: 'Verify your e-mail address',
    html: emailHtml({
      heading: 'Verify your e-mail address',
      paragraphs: [`Hello ${user.name},`, 'Use the link below to confirm this e-mail address for your K C Model School & College account. The link expires in 1 hour.'],
      ctaLabel: 'Verify e-mail address',
      ctaUrl: link,
    }),
    text: `Verify your e-mail address: ${link}\nThis link expires in 1 hour.`,
  });
  if (!result.ok) {
    await query('delete from email_change_tokens where token_hash = $1', [tokenHash]);
    return fail('The verification e-mail could not be sent. Please try again later.');
  }
  return ok(`A verification link was sent to ${email}. Your current e-mail stays active until you verify it.`);
}

export async function verifyEmailChange(_prev: FormState, fd: FormData): Promise<FormState> {
  const raw = str(fd, 'token', 200);
  if (!/^[a-f0-9]{64}$/.test(raw)) return fail('This verification link is invalid or expired. Request a new one from Settings.');
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  const changed = await one<{ email: string }>(
    `with valid_token as (
       update email_change_tokens set used_at = now()
        where token_hash = $1 and used_at is null and expires_at > now()
        returning user_id, email
     )
     update users u set email = v.email
       from valid_token v
      where u.id = v.user_id
        and not exists (select 1 from users other where lower(other.email) = lower(v.email) and other.id <> u.id)
     returning u.email`,
    [tokenHash],
  );
  if (!changed) return fail('This link has expired, was already used, or the e-mail is now linked to another account. Request a new link from Settings.');
  revalidatePath('/settings');
  revalidatePath('/employees');
  return ok(`Your e-mail address is now ${changed.email}.`);
}
