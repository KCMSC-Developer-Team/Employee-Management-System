'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title" style={{ color: 'var(--color-burgundy)' }}>Something went wrong</h1>
        <p className="muted center">This page could not be shown. Nothing you typed was lost on the server.</p>
        <div className="alert alert-err" style={{ wordBreak: 'break-word' }}>
          {error.message || 'Unknown error'}
          {error.digest ? <div className="small">Reference: {error.digest}</div> : null}
        </div>
        <div className="row gap" style={{ marginTop: 16, justifyContent: 'center' }}>
          <button className="btn" type="button" onClick={() => reset()}>
            Try again
          </button>
          <a className="btn btn-secondary" href="/login">
            Go to sign in
          </a>
        </div>
        <p className="muted small center" style={{ marginTop: 14 }}>
          Developer: open <a href="/api/health">/api/health</a> to check the settings.
        </p>
      </div>
    </div>
  );
}
