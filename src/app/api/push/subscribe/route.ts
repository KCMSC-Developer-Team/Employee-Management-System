import { getUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sub = await req.json().catch(() => null);
  const endpoint: unknown = sub?.endpoint;
  const p256dh: unknown = sub?.keys?.p256dh;
  const auth: unknown = sub?.keys?.auth;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  await query(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1,$2,$3,$4)
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [user.id, endpoint, p256dh, auth],
  );
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint === 'string') {
    await query('delete from push_subscriptions where endpoint = $1 and user_id = $2', [body.endpoint, user.id]);
  }
  return Response.json({ ok: true });
}
