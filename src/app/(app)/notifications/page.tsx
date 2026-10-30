import Link from 'next/link';
import { markAllRead } from '@/actions/misc';
import { EmptyState, PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDateTime } from '@/lib/utils';
import { isDeveloper } from '@/lib/roles';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await query<{ id: string; title: string; body: string; created_at: string; read_at: string | null }>(
    'select id, title, body, created_at, read_at from notifications where user_id = $1 order by created_at desc limit 100',
    [user.id],
  );
  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <>
      <PageHead title="Notifications" sub={unread ? `${unread} unread` : 'You are all caught up.'}>
        {isDeveloper(user.roles) && <Link href="/notifications/compose" className="btn">Send notification</Link>}
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="btn btn-secondary" type="submit">
              Mark all as read
            </button>
          </form>
        )}
      </PageHead>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState title="You’re all caught up" description="New notifications will appear here when there’s something to review." />
        </div>
      ) : (
        <div className="card list">
          {rows.map((n) => (
            <Link key={n.id} href={`/notifications/go/${n.id}`} className={`list-item ${n.read_at ? '' : 'unread'}`} prefetch={false}>
              <span className="unread-dot" aria-hidden="true" />
              <div className="grow">
                <div className="title">{n.title}</div>
                {n.body && <div className="muted">{n.body}</div>}
              </div>
              <time className="muted small">{fmtDateTime(n.created_at)}</time>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
