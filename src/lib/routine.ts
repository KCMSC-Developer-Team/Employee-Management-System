import type { Period, Section } from './types';

export const SECTION_LABELS: Record<Section, string> = {
  junior: 'Junior Section',
  senior: 'Senior Section',
};

/** Sunday → Thursday (Friday and Saturday are weekly holidays). 0 = Sunday … 6 = Saturday. */
export const DAY_ORDER = [0, 1, 2, 3, 4];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const fmtRange = (p: Pick<Period, 'start_time' | 'end_time'>) =>
  `${fmtTime(p.start_time)} – ${fmtTime(p.end_time)}`;

export const cellKey = (section: string, mentorId: string, periodId: string) => `${section}:${mentorId}:${periodId}`;

export type Cell = {
  section: Section;
  mentorId: string;
  mentorName: string;
  period: Pick<Period, 'id' | 'label' | 'start_time' | 'end_time'>;
  cls: string;
};

export type Conflict = {
  type: 'class' | 'mentor';
  message: string;
  keys: string[];
};

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const overlaps = (a: Cell, b: Cell) =>
  toMin(a.period.start_time) < toMin(b.period.end_time) && toMin(b.period.start_time) < toMin(a.period.end_time);
const keyOf = (c: Cell) => cellKey(c.section, c.mentorId, c.period.id);

/**
 * Looks at every filled cell of ONE day (both sections together) and reports
 *  • the same class booked twice at the same / overlapping time
 *  • one mentor booked in two places at the same / overlapping time
 */
export function findConflicts(cells: Cell[]): Conflict[] {
  const filled = cells.filter((c) => c.cls.trim() !== '');
  const out: Conflict[] = [];
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const a = filled[i];
      const b = filled[j];
      if (!overlaps(a, b)) continue;
      if (norm(a.cls) === norm(b.cls)) {
        out.push({
          type: 'class',
          message: `Class “${a.cls.trim()}” is booked twice at the same time: ${a.mentorName} (${a.period.label}) and ${b.mentorName} (${b.period.label}).`,
          keys: [keyOf(a), keyOf(b)],
        });
      }
      if (a.mentorId === b.mentorId) {
        out.push({
          type: 'mentor',
          message: `${a.mentorName} has two classes at the same time: “${a.cls.trim()}” (${a.period.label}, ${SECTION_LABELS[a.section]}) and “${b.cls.trim()}” (${b.period.label}, ${SECTION_LABELS[b.section]}).`,
          keys: [keyOf(a), keyOf(b)],
        });
      }
    }
  }
  return out;
}

/** Number of muted colour tones used to colour-code classes (see .tone-0 … .tone-7 in globals.css). */
export const CLASS_TONE_COUNT = 8;

/**
 * Same class name → same tone, everywhere (grid, schedule, legend).
 * Names are normalised so "Class 6A", "class 6a " and "Class  6A" share a colour.
 * Returns null for an empty name.
 */
export function classTone(name: string | null | undefined): number | null {
  const n = (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!n) return null;
  let h = 2166136261;
  for (let i = 0; i < n.length; i++) {
    h ^= n.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % CLASS_TONE_COUNT;
}
