'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SessionUser } from '@/lib/types';
import { Avatar } from '@/components/ui';
import { InfoPanel } from '@/components/InfoPanel';

export type AppNavItem = { href: string; label: string; badge?: number; group: 'Workspace' | 'People' | 'Account' };

const ICONS: Record<string, string> = {
  '/dashboard': 'M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6',
  '/my-routine': 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2Z',
  '/routine': 'M4 5h16M4 12h16M4 19h16M8 3v4m8 3v4m-8 3v4',
  '/directory': 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7a4 4 0 0 1 0 8m1 3h1a4 4 0 0 1 4 4v2',
  '/employees': 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-5h6m-3-3v6',
  '/approvals': 'm5 12 4 4L19 6',
  '/employees/new': 'M12 5v14m-7-7h14',
  '/employees/import': 'M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4',
  '/objections': 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  '/profile': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  '/settings': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3m10-10h-3M5 12H2m17.1-7.1L17 7m-10 10-2.1 2.1m14.2 0L17 17M7 7 4.9 4.9',
};

function Icon({ href, className = '' }: { href: string; className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[href] || 'M5 5h14v14H5z'} />
    </svg>
  );
}

export function AppShell({
  children,
  user,
  items,
  unread,
  logout,
}: {
  children: ReactNode;
  user: Pick<SessionUser, 'id' | 'name' | 'designation' | 'has_photo' | 'photo_version'>;
  items: AppNavItem[];
  unread: number;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const groups = useMemo(() => ['Workspace', 'People', 'Account'].map((group) => ({
    name: group,
    items: items.filter((item) => item.group === group),
  })).filter((group) => group.items.length), [items]);
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find((item) =>
    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)),
  );
  const pageLabel = current?.label || pathname.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ') || 'Dashboard';
  const context = current?.group || (pathname.startsWith('/notifications') ? 'Account' : 'Workspace');
  const parentSegment = pathname.split('/').filter(Boolean)[1];
  const parentLabel = parentSegment ? items.find((item) => item.href === `/${pathname.split('/').filter(Boolean)[0]}`)?.label || parentSegment.replace(/-/g, ' ') : '';

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('kc-sidebar-collapsed') === '1');
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const resetMobileDrawer = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', resetMobileDrawer);
    return () => desktop.removeEventListener('change', resetMobileDrawer);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      } else if (event.key === 'Tab') {
        const controls = document.querySelectorAll<HTMLElement>('#app-sidebar a[href], #app-sidebar button:not([disabled]), #app-sidebar input:not([disabled]), #app-sidebar select:not([disabled]), #app-sidebar textarea:not([disabled])');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  function closeMobileNav() {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem('kc-sidebar-collapsed', next ? '1' : '0');
  }

  return (
    <div className={`shell app-shell${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={closeMobileNav} />}
      <aside id="app-sidebar" className="sidebar no-print" aria-label="Application navigation">
        <Link href="/dashboard" className="brand" aria-label="K C Model School & College dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={38} height={42} />
          <span className="brand-copy">K C Model<br />School &amp; College</span>
        </Link>
        <button className="sidebar-close" ref={drawerCloseRef} type="button" onClick={closeMobileNav} aria-label="Close navigation"><span aria-hidden="true">×</span></button>
        <button className="sidebar-collapse" type="button" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span><span className="collapse-copy">Collapse</span>
        </button>
        <nav className="nav" aria-label="Main navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.name}>
              <div className="nav-group-label">{group.name}</div>
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={active ? 'active' : ''} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}>
                    <Icon href={item.href} />
                    <span className="nav-label">{item.label}</span>
                    {item.badge ? <span className="count">{item.badge > 99 ? '99+' : item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-account">
          <Link href="/profile" onClick={() => setMobileOpen(false)} className="sidebar-user">
            <Avatar id={user.id} name={user.name} has={user.has_photo} v={user.photo_version} size={36} />
            <span className="user-text"><strong>{user.name}</strong><small>{user.designation}</small></span>
          </Link>
          <form action={logout}><button className="sidebar-signout" type="submit"><span aria-hidden="true">↪</span><span className="nav-label">Sign out</span></button></form>
        </div>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <div className="topbar-context">
            <button ref={menuButtonRef} id="mobile-menu-toggle" className="mobile-menu-toggle" type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="app-sidebar" onClick={() => setMobileOpen((open) => !open)}>
              <span /><span /><span />
            </button>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <strong>{pageLabel}</strong>
              {parentLabel && <><span className="breadcrumb-sep">/</span><span>{context}</span></>}
            </nav>
          </div>
          <div className="row gap topbar-actions">
            <InfoPanel />
            <Link href="/notifications" className="icon-btn bell" aria-label={`Notifications, ${unread} unread`} title="Notifications">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
              {unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
