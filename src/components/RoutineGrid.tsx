'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveDay } from '@/actions/routine';
import { cellKey, classTone, findConflicts, fmtRange, type Cell } from '@/lib/routine';
import type { Period, Section } from '@/lib/types';

type Mentor = { id: string; name: string; designation: string };
type Entry = { section: Section; mentor_id: string; period_id: string; class_name: string };

export function RoutineGrid({
  section,
  day,
  periods,
  otherPeriods,
  mentors,
  entries,
  suggestions,
}: {
  section: Section;
  day: number;
  periods: Period[];
  otherPeriods: Period[];
  mentors: Mentor[];
  entries: Entry[];
  suggestions: string[];
}) {
  // Tiffin periods are breaks: no class is ever entered or saved for them.
  const tiffinIds = useMemo(
    () => new Set([...periods, ...otherPeriods].filter((p) => p.kind === 'tiffin').map((p) => p.id)),
    [periods, otherPeriods],
  );

  const [cells, setCells] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const e of entries) {
      if (tiffinIds.has(e.period_id)) continue;
      m[cellKey(e.section, e.mentor_id, e.period_id)] = e.class_name;
    }
    return m;
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const periodMap = useMemo(() => {
    const m = new Map<string, Period>();
    for (const p of [...periods, ...otherPeriods]) m.set(p.id, p);
    return m;
  }, [periods, otherPeriods]);
  const mentorMap = useMemo(() => new Map(mentors.map((m) => [m.id, m])), [mentors]);

  const conflicts = useMemo(() => {
    const list: Cell[] = [];
    for (const [key, cls] of Object.entries(cells)) {
      const [sec, mentorId, periodId] = key.split(':');
      const p = periodMap.get(periodId);
      const mentor = mentorMap.get(mentorId);
      if (!p || !mentor) continue;
      list.push({ section: sec as Section, mentorId, mentorName: mentor.name, period: p, cls });
    }
    return findConflicts(list);
  }, [cells, periodMap, mentorMap]);

  const bad = useMemo(() => new Set(conflicts.flatMap((c) => c.keys)), [conflicts]);

  // One legend entry per distinct class in use (shown in its colour).
  const legend = useMemo(() => {
    const seen = new Map<string, { name: string; tone: number }>();
    for (const cls of Object.values(cells)) {
      const tone = classTone(cls);
      if (tone === null) continue;
      const norm = cls.trim().replace(/\s+/g, ' ').toLowerCase();
      if (!seen.has(norm)) seen.set(norm, { name: cls.trim().replace(/\s+/g, ' '), tone });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [cells]);

  function save() {
    if (conflicts.length > 0 && !window.confirm(`There are ${conflicts.length} warning(s). Save the routine anyway?`)) return;
    const payload = Object.entries(cells)
      .filter(([k, v]) => k.startsWith(section + ':') && v.trim() !== '')
      .map(([k, cls]) => {
        const [, mentorId, periodId] = k.split(':');
        return { mentorId, periodId, cls };
      })
      .filter((c) => !tiffinIds.has(c.periodId));
    start(async () => {
      const r = await saveDay(section, day, payload);
      setMsg({ ok: r?.ok ?? false, text: r?.message ?? 'Saved.' });
    });
  }

  return (
    <div>
      <datalist id="class-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {conflicts.length > 0 ? (
        <div className="alert alert-warn" role="alert">
          <strong>{conflicts.length} warning(s) — please check:</strong>
          <ul>
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="alert alert-ok">No clashes found.</div>
      )}

      <p className="routine-grid-help muted small">Enter the assigned class in each mentor’s period. The grid checks conflicts across both wings.</p>
      <div className="table-wrap routine-grid-wrap" style={{ marginTop: 12 }}>
        <table className="table routine-table">
          <thead>
            <tr>
              <th className="sticky-col">Mentor</th>
              {periods.map((p) => (
                <th key={p.id} className={p.kind === 'tiffin' ? 'tiffin' : ''}>
                  <div>{p.label}</div>
                  <div className="muted small">{fmtRange(p)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mentors.map((m) => (
              <tr key={m.id}>
                <th className="sticky-col" scope="row">
                  <div>{m.name}</div>
                  <div className="muted small">{m.designation}</div>
                </th>
                {periods.map((p) => {
                  if (p.kind === 'tiffin') {
                    return <td key={p.id} className="tiffin tiffin-blank" aria-label={`${m.name}, ${p.label} (break)`} />;
                  }
                  const key = cellKey(section, m.id, p.id);
                  const isBad = bad.has(key);
                  const tone = isBad ? null : classTone(cells[key]);
                  return (
                    <td key={p.id}>
                      <input
                        className={`cell-input ${isBad ? 'cell-bad' : ''} ${tone !== null ? `tone-${tone}` : ''}`}
                        list="class-suggestions"
                        value={cells[key] ?? ''}
                        maxLength={40}
                        aria-label={`${m.name}, ${p.label}`}
                        onChange={(e) => {
                          setMsg(null);
                          setCells((c) => ({ ...c, [key]: e.target.value }));
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {legend.length > 0 && (
        <div className="class-legend" aria-label="Class colour key">
          <span className="class-legend-label">Classes</span>
          {legend.map((item) => (
            <span key={item.tone} className={`chip class-chip tone-${item.tone}`}>{item.name}</span>
          ))}
        </div>
      )}

      <div className="routine-savebar">
        <button className="btn" type="button" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : conflicts.length ? `Save with ${conflicts.length} warning(s)` : 'Save routine'}
        </button>
        {msg && <span className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`} role="status" style={{ margin: 0 }}>{msg.text}</span>}
      </div>
    </div>
  );
}
