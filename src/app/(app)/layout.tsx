import Link from 'next/link';
import { logout } from '@/actions/auth';
import { InfoPanel } from '@/components/InfoPanel';
import { NavLinks, type NavItem } from '@/components/NavLinks';
import { Avatar } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const r = user.roles;

  const [unread, pending] = await Promise.all([
    one<{ n: number }>('select count(*)::int as n from notifications where user_id = $1 and read_at is null', [user.id]),
    can(r, 'it', 'authority')
      ? one<{ n: number }>(
          `select count(*)::int as n from profile_edits where status = 'pending' and user_id <> $1`,
          [user.id],
        )
      : Promise.resolve({ n: 0 }),
  ]);

  const items: NavItem[] = [{ href: '/dashboard', label: 'Dashboard' }];
  if (can(r, 'mentor') || r.includes('mentor')) items.push({ href: '/my-routine', label: 'My routine' });
  if (can(r, 'coordinator')) items.push({ href: '/routine', label: 'Routine editor' });
  items.push({ href: '/directory', label: 'Mentor directory' });
  if (can(r, 'it', 'authority')) items.push({ href: '/employees', label: 'Employees' });
  if (can(r, 'it', 'authority')) items.push({ href: '/approvals', label: 'Approvals', badge: pending?.n || 0 });
  if (can(r, 'it')) items.push({ href: '/employees/new', label: 'Add employee' });
  if (can(r, 'it')) items.push({ href: '/employees/import', label: 'Import from spreadsheet' });
  items.push({ href: '/objections', label: 'My objections' });
  items.push({ href: '/profile', label: 'My profile' });
  items.push({ href: '/settings', label: 'Settings' });

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <Link href="/dashboard" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={38} height={42} />
          <span>
            K C Model
            <br />
            School &amp; College
          </span>
        </Link>
        <NavLinks items={items} />
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <div className="topbar-title">Employee System</div>
          <div className="row gap">
            <InfoPanel />
            <Link href="/notifications" className="icon-btn bell" aria-label={`Notifications, ${unread?.n ?? 0} unread`} title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unread && unread.n > 0 ? <span className="dot">{unread.n > 99 ? '99+' : unread.n}</span> : null}
            </Link>
            <Link href="/profile" className="user-chip">
              <Avatar id={user.id} name={user.name} has={user.has_photo} v={user.photo_version} size={34} />
              <span className="user-text">
                <strong>{user.name}</strong>
                <small>{user.designation}</small>
              </span>
            </Link>
            <form action={logout}>
              <button className="btn btn-secondary btn-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
