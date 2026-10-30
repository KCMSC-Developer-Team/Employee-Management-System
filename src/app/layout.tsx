import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'K C Model School & College — Employee System', template: '%s · K C Model School & College' },
  description: 'Employee management system of K C Model School & College.',
};

export const viewport: Viewport = { themeColor: '#124C36', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
