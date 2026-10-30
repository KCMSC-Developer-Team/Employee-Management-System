'use client';

import { useEffect, useState } from 'react';

const urlB64ToUint8 = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setSupported(false);
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg('');
    try {
      if (!key) throw new Error('Browser notifications are not set up on the server yet.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permission was not given. Allow notifications in your browser settings and try again.');
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) }));
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('Could not save this browser. Please try again.');
      setEnabled(true);
      setMsg('Browser notifications are on for this device.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMsg('Browser notifications are off for this device.');
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return <p className="muted small">This browser does not support push notifications. You will still receive e-mail.</p>;

  return (
    <div>
      <div className="row gap">
        <span className={`chip ${enabled ? 'chip-green' : ''}`}>{enabled ? 'Enabled on this browser' : 'Not enabled on this browser'}</span>
        {enabled ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={disable}>
            Turn off for this browser
          </button>
        ) : (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={enable}>
            Enable on this browser
          </button>
        )}
      </div>
      {msg && <p className="muted small" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
