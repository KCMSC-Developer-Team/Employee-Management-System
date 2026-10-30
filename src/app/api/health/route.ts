import { query } from '@/lib/db';
import { DEVELOPER_EMAIL } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Open  https://YOUR-SITE/api/health  to see which setting is wrong.
 * Shows only yes/no for secrets, never their values.
 */
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    AUTH_SECRET_ok: (process.env.AUTH_SECRET ?? '').length >= 16,
    APP_URL: process.env.APP_URL || '(not set — links in e-mails will use the Vercel address)',
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    EMAIL_FROM: process.env.EMAIL_FROM || '(not set — using the Resend test sender)',
    VAPID_keys: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    DEVELOPER_EMAIL,
  };

  const db: Record<string, string> = {};
  for (const table of ['users', 'auth_tokens', 'periods', 'notifications']) {
    try {
      const rows = await query<{ n: number }>(`select count(*)::int as n from ${table}`);
      db[table] = `ok (${rows[0]?.n ?? 0} rows)`;
    } catch (e) {
      db[table] = 'ERROR: ' + (e instanceof Error ? e.message : String(e)).slice(0, 140);
    }
  }

  let developer = 'unknown';
  try {
    const rows = await query<{ has_password: boolean; roles: string[] }>(
      'select (password_hash is not null) as has_password, roles from users where lower(email) = $1',
      [DEVELOPER_EMAIL],
    );
    developer = rows.length
      ? `account exists, password ${rows[0].has_password ? 'is set' : 'NOT set yet'}, developer role ${rows[0].roles.includes('developer') ? 'yes' : 'NO'}`
      : 'no account yet — open /setup';
  } catch {
    /* reported above */
  }

  return Response.json({ env, db, developer });
}
