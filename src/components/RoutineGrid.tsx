'use client';

import { useMemo, useState, useTransition } from 'react';
import { saveDay } from '@/actions/routine';
import { cellKey, findConflicts, fmtRange, type Cell } from '@/lib/routine';
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
  const [cells, setCells] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const e of entries) m[cellKey(e.section, e.mentor_id, e.period_id)] = e.class_name;
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

  function save() {
    if (conflicts.length > 0 && !window.confirm(`There are ${conflicts.length} warning(s). Save the routine anyway?`)) return;
    const payload = Object.entries(cells)
      .filter(([k, v]) => k.startsWith(section + ':') && v.trim() !== '')
      .map(([k, cls]) => {
        const [, mentorId, periodId] = k.split(':');
        return { mentorId, periodId, cls };
      });
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

      <div className="table-wrap" style={{ marginTop: 12 }}>
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
                  const key = cellKey(section, m.id, p.id);
                  return (
                    <td key={p.id} className={p.kind === 'tiffin' ? 'tiffin' : ''}>
                      <input
                        className={`cell-input ${bad.has(key) ? 'cell-bad' : ''}`}
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

      <div className="row gap" style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : conflicts.length ? `Save with ${conflicts.length} warning(s)` : 'Save routine'}
        </button>
        {msg && <span className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`} style={{ margin: 0 }}>{msg.text}</span>}
      </div>
    </div>
  );
}
