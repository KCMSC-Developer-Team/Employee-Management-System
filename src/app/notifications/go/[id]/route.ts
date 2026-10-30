import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { one, query } from '@/lib/db';

/** Opens a notification: marks it as read, then goes to the page it points at. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const base = new URL(req.url);
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/login', base));
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL('/notifications', base));

  const n = await one<{ url: string | null }>(
    'update notifications set read_at = coalesce(read_at, now()) where id = $1 and user_id = $2 returning url',
    [id, user.id],
  );
  const target = n?.url && n.url.startsWith('/') ? n.url : '/notifications';
  return NextResponse.redirect(new URL(target, base));
}
