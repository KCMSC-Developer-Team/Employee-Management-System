'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GENERAL_HELP, getHelp } from '@/lib/help';

export function InfoPanel() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const help = getHelp(pathname);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button type="button" className="icon-btn info-btn" aria-label="Help about this page" title="Help about this page" onClick={() => setOpen(true)}>
        i
      </button>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Help">
        <div className="drawer-head">
          <h2>{help.title}</h2>
          <button type="button" className="icon-btn" aria-label="Close help" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <p className="lead">{help.summary}</p>
        <h3>How to use this page</h3>
        <ol className="steps">
          {help.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {help.notes && (
          <div className="note">
            <strong>Good to know</strong>
            <ul>
              {help.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <h3>About this system</h3>
        <ul className="plain">
          {GENERAL_HELP.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </aside>
    </>
  );
}
