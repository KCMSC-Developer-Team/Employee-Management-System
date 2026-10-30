'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; badge?: number };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/') && !items.some((i) => i.href !== href && i.href.length > href.length && pathname.startsWith(i.href)));
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={active(i.href) ? 'active' : ''}>
          <span>{i.label}</span>
          {i.badge ? <span className="count">{i.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
