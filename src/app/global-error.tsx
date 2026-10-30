'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Segoe UI, Arial, sans-serif', background: '#F7F5EF', color: '#242824', padding: 24 }}>
        <h1 style={{ color: '#7F3035' }}>Something went wrong</h1>
        <p>{error.message || 'Unknown error'}</p>
        {error.digest && <p style={{ color: '#69716B' }}>Reference: {error.digest}</p>}
        <p>
          <a href="/login">Go to sign in</a> · <a href="/api/health">Check settings</a>
        </p>
      </body>
    </html>
  );
}
