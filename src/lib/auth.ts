import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { one, query } from './db';
import { can } from './roles';
import type { Role, SessionUser } from './types';

const COOKIE = 'kc_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET is missing or too short');
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  // bcrypt truncates after 72 bytes; pre-hash so the full password is represented.
  return bcrypt.hash(createHash('sha256').update(pw, 'utf8').digest('base64'), 10);
}

export async function verifyPassword(pw: string, hash: string | null | undefined) {
  // Always run a comparison so response time does not reveal whether the account exists.
  const dummy = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Zq6mYpKQ5yQ1N0b3z3bYtq9m5w8nK';
  const ok = await bcrypt.compare(createHash('sha256').update(pw, 'utf8').digest('base64'), hash || dummy);
  const legacyOk = hash ? await bcrypt.compare(pw, hash).catch(() => false) : false;
  return Boolean(hash) && (ok || legacyOk);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let id: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secret());
    id = payload.sub;
  } catch {
    return null;
  }
  if (!id) return null;
  return one<SessionUser>(
    `select id, email, name, designation, roles, (photo is not null) as has_photo,
            photo_version, notif_push, notif_email
       from users where id = $1 and active = true`,
    [id],
  );
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.roles, ...roles)) redirect('/dashboard');
  return user;
}

/* ── one-time tokens (invite + password reset) ─────────────── */

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createToken(userId: string, purpose: 'invite' | 'reset', hours: number) {
  const raw = randomBytes(32).toString('hex');
  await query(`delete from auth_tokens where user_id = $1 and purpose = $2`, [userId, purpose]);
  await query(
    `insert into auth_tokens (token_hash, user_id, purpose, expires_at)
     values ($1, $2, $3, now() + ($4 || ' hours')::interval)`,
    [sha(raw), userId, purpose, String(hours)],
  );
  return raw;
}

export async function peekToken(raw: string): Promise<string | null> {
  const row = await one<{ user_id: string }>(
    `select user_id from auth_tokens where token_hash = $1 and used_at is null and expires_at > now()`,
    [sha(raw)],
  );
  return row?.user_id ?? null;
}

export async function consumeToken(raw: string): Promise<string | null> {
  const row = await one<{ user_id: string }>(
    `update auth_tokens set used_at = now()
      where token_hash = $1 and used_at is null and expires_at > now()
      returning user_id`,
    [sha(raw)],
  );
  return row?.user_id ?? null;
}
