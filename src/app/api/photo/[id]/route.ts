import { getUser } from '@/lib/auth';
import { one } from '@/lib/db';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getUser();
  if (!me) return new Response('Unauthorized', { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });

  const row = await one<{ photo: string | null }>('select photo from users where id = $1', [id]);
  const m = row?.photo?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response('Not found', { status: 404 });

  return new Response(Buffer.from(m[2], 'base64'), {
    headers: {
      'Content-Type': m[1],
      // the URL carries ?v=<photo_version>, so it is safe to cache for a long time
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
}
