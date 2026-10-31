import { logout } from '@/actions/auth';
import { AppShell, type AppNavItem } from '@/components/AppShell';
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

  const items: AppNavItem[] = [{ href: '/dashboard', label: 'Dashboard', group: 'Workspace' }];
  if (can(r, 'mentor') || r.includes('mentor')) items.push({ href: '/my-routine', label: 'My routine', group: 'Workspace' });
  if (can(r, 'coordinator')) items.push({ href: '/routine', label: 'Routine editor', group: 'Workspace' });
  items.push({ href: '/directory', label: 'Mentor directory', group: 'People' });
  if (can(r, 'it', 'authority')) items.push({ href: '/employees', label: 'Employees', group: 'People' });
  if (can(r, 'it', 'authority')) items.push({ href: '/approvals', label: 'Approvals', badge: pending?.n || 0, group: 'People' });
  if (can(r, 'it')) items.push({ href: '/employees/new', label: 'Add employee', group: 'People' });
  if (can(r, 'it')) items.push({ href: '/employees/import', label: 'Import from spreadsheet', group: 'People' });
  if (r.includes('developer')) items.push({ href: '/employees/setup-emails', label: 'Set-up e-mails', group: 'People' });
  items.push({ href: '/objections', label: 'My objections', group: 'Account' });
  items.push({ href: '/profile', label: 'My profile', group: 'Account' });
  items.push({ href: '/settings', label: 'Settings', group: 'Account' });

  return (
    <AppShell
      user={{ id: user.id, name: user.name, designation: user.designation, has_photo: user.has_photo, photo_version: user.photo_version }}
      items={items}
      unread={unread?.n ?? 0}
      logout={logout}
    >
      {children}
    </AppShell>
  );
}
