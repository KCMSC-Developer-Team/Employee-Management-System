import webpush from 'web-push';
import { query } from './db';
import { emailHtml, sendEmails } from './mail';
import { appUrl } from './utils';

export type Notice = { title: string; body: string; url?: string };

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  vapidReady = true;
  return true;
}

/**
 * One call = notification centre entry + browser push + e-mail,
 * honouring each person's own switches (they can never have both off).
 * Never throws: a failed e-mail must not break the action that triggered it.
 */
export async function notify(userIds: string[], notice: Notice) {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return;
  try {
    const users = await query<{ id: string; email: string; name: string; notif_push: boolean; notif_email: boolean }>(
      `select id, email, name, notif_push, notif_email from users where id = any($1::uuid[]) and active = true`,
      [ids],
    );
    if (users.length === 0) return;

    const inserted = await query<{ id: string; user_id: string }>(
      `insert into notifications (user_id, title, body, url)
       select unnest($1::uuid[]), $2, $3, $4 returning id, user_id`,
      [users.map((u) => u.id), notice.title, notice.body, notice.url ?? null],
    );
    const notifId = new Map(inserted.map((r) => [r.user_id, r.id]));

    // E-mail
    const emailTargets = users.filter((u) => u.notif_email && u.email);
    if (emailTargets.length) {
      const link = appUrl() + (notice.url ?? '/notifications');
      const html = emailHtml({
        heading: notice.title,
        paragraphs: [notice.body],
        ctaLabel: 'Open in the system',
        ctaUrl: link,
      });
      const r = await sendEmails(
        emailTargets.map((u) => ({
          to: u.email,
          subject: notice.title,
          html,
          text: `${notice.title}\n\n${notice.body}\n\n${link}`,
        })),
      );
      if (!r.ok) console.warn('[notify] email:', r.error);
    }

    // Browser push
    const pushTargets = users.filter((u) => u.notif_push).map((u) => u.id);
    if (pushTargets.length && setupVapid()) {
      const subs = await query<{ id: string; user_id: string; endpoint: string; p256dh: string; auth: string }>(
        `select id, user_id, endpoint, p256dh, auth from push_subscriptions where user_id = any($1::uuid[])`,
        [pushTargets],
      );
      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({
                title: notice.title,
                body: notice.body,
                url: `/notifications/go/${notifId.get(s.user_id)}`,
              }),
            );
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              await query('delete from push_subscriptions where id = $1', [s.id]);
            }
          }
        }),
      );
    }
  } catch (e) {
    console.error('[notify] failed', e);
  }
}

/** IDs of everyone holding any of the given roles (Developers always included). */
export async function userIdsWithRoles(roles: string[], exclude?: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `select id from users where active = true and (roles && $1::text[] or 'developer' = any(roles))
       and ($2::uuid is null or id <> $2::uuid)`,
    [roles, exclude ?? null],
  );
  return rows.map((r) => r.id);
}
