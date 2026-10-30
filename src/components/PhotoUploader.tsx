'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { removePhoto, savePhoto } from '@/actions/profile';

const VIEW = 300; // crop box on screen (px)
const OUT = 400; // exported picture (px)

export function PhotoUploader({ hasPhoto }: { hasPhoto: boolean }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const base = img ? VIEW / Math.min(img.width, img.height) : 1;

  const clamp = (o: { x: number; y: number }, z = zoom) => {
    if (!img) return o;
    const mx = Math.max(0, (img.width * base * z - VIEW) / 2);
    const my = Math.max(0, (img.height * base * z - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };

  function paint(target: HTMLCanvasElement, size: number) {
    if (!img) return;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const k = size / VIEW;
    const w = img.width * base * zoom * k;
    const h = img.height * base * zoom * k;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, size / 2 - w / 2 + off.x * k, size / 2 - h / 2 + off.y * k, w, h);
  }

  useEffect(() => {
    if (canvas.current) paint(canvas.current, VIEW);
  });

  function pick(file: File | undefined) {
    setMsg(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMsg({ ok: false, text: 'Please choose an image file.' });
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      setZoom(1);
      setOff({ x: 0, y: 0 });
      setImg(im);
    };
    im.onerror = () => setMsg({ ok: false, text: 'This image could not be opened.' });
    im.src = url;
  }

  function save() {
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = OUT;
    out.height = OUT;
    paint(out, OUT);
    const data = out.toDataURL('image/jpeg', 0.85);
    start(async () => {
      const r = await savePhoto(data);
      setMsg({ ok: r?.ok ?? false, text: r?.message ?? '' });
      if (r?.ok) setImg(null);
    });
  }

  return (
    <div className="photo-tools">
      {!img && (
        <div className="row gap">
          <label className="btn btn-secondary btn-sm">
            {hasPhoto ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {hasPhoto && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await removePhoto();
                  setMsg({ ok: r?.ok ?? false, text: r?.message ?? '' });
                })
              }
            >
              Remove
            </button>
          )}
        </div>
      )}

      {img && (
        <div className="cropper">
          <p className="muted small">Drag the picture to move it. Use the slider to zoom.</p>
          <canvas
            ref={canvas}
            width={VIEW}
            height={VIEW}
            className="crop-canvas"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              setOff(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y }));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              setOff((o) => clamp(o, z));
            }}
          />
          <div className="row gap">
            <button type="button" className="btn btn-sm" disabled={pending} onClick={save}>
              {pending ? 'Saving…' : 'Use this photo'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImg(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {msg && <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`}>{msg.text}</div>}
    </div>
  );
}
