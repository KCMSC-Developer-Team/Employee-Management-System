'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { fail, ok, str } from '@/lib/form';
import { notify } from '@/lib/notify';
import { DAY_NAMES, SECTION_LABELS, toMin } from '@/lib/routine';
import type { FormState, Section } from '@/lib/types';

const isSection = (s: string): s is Section => s === 'junior' || s === 'senior';
const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export type SaveCell = { mentorId: string; periodId: string; cls: string };

/** Replaces the whole routine of one section on one day, then tells every mentor whose routine changed. */
export async function saveDay(section: string, day: number, cells: SaveCell[]): Promise<FormState> {
  await requireRole('coordinator');
  if (!isSection(section) || !Number.isInteger(day) || day < 0 || day > 6) return fail('Invalid section or day.');

  const periods = await query<{ id: string }>('select id from periods where section = $1', [section]);
  const mentors = await query<{ id: string }>(`select id from users where active = true and 'mentor' = any(roles)`);
  const validPeriod = new Set(periods.map((p) => p.id));
  const validMentor = new Set(mentors.map((m) => m.id));

  const next = new Map<string, { m: string; p: string; c: string }>();
  for (const c of cells ?? []) {
    const cls = String(c.cls ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!cls || !validPeriod.has(c.periodId) || !validMentor.has(c.mentorId)) continue;
    next.set(`${c.mentorId}:${c.periodId}`, { m: c.mentorId, p: c.periodId, c: cls });
  }

  const oldRows = await query<{ mentor_id: string; period_id: string; class_name: string }>(
    'select mentor_id, period_id, class_name from routine_entries where section = $1 and day = $2',
    [section, day],
  );
  const old = new Map(oldRows.map((r) => [`${r.mentor_id}:${r.period_id}`, r.class_name]));

  const changedMentors = new Set<string>();
  for (const [k, v] of next) if (old.get(k) !== v.c) changedMentors.add(v.m);
  for (const [k] of old) if (!next.has(k)) changedMentors.add(k.split(':')[0]);

  await query('delete from routine_entries where section = $1 and day = $2', [section, day]);
  const list = Array.from(next.values());
  if (list.length) {
    await query(
      `insert into routine_entries (section, day, mentor_id, period_id, class_name)
       select $1, $2, t.m, t.p, t.c from unnest($3::uuid[], $4::uuid[], $5::text[]) as t(m, p, c)`,
      [section, day, list.map((x) => x.m), list.map((x) => x.p), list.map((x) => x.c)],
    );
  }

  const ids = Array.from(changedMentors).filter((id) => validMentor.has(id));
  await notify(ids, {
    title: `Routine updated — ${DAY_NAMES[day]}`,
    body: `Your ${SECTION_LABELS[section]} routine for ${DAY_NAMES[day]} was changed. Open “My routine” to see it.`,
    url: `/my-routine?day=${day}`,
  });
  revalidatePath('/routine');
  revalidatePath('/my-routine');
  return ok(
    ids.length ? `Routine saved. ${ids.length} mentor(s) notified.` : 'Routine saved. Nothing changed for any mentor.',
  );
}

async function notifyAllMentors(title: string, body: string) {
  const mentors = await query<{ id: string }>(`select id from users where active = true and 'mentor' = any(roles)`);
  await notify(mentors.map((m) => m.id), { title, body, url: '/my-routine' });
}

export async function savePeriods(section: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole('coordinator');
  if (!isSection(section)) return fail('Invalid section.');
  const ids = fd.getAll('ids').map(String);
  const existing = await query<{ id: string; label: string; start_time: string; end_time: string }>(
    'select id, label, start_time, end_time from periods where section = $1',
    [section],
  );
  const byId = new Map(existing.map((p) => [p.id, p]));
  let timingChanged = false;

  for (const id of ids) {
    const before = byId.get(id);
    if (!before) continue;
    const label = str(fd, `label_${id}`, 40);
    const kind = str(fd, `kind_${id}`, 10);
    const start = str(fd, `start_${id}`, 5);
    const end = str(fd, `end_${id}`, 5);
    const pos = parseInt(str(fd, `pos_${id}`, 4), 10);
    if (!label) return fail('Every period needs a name.');
    if (!['form', 'period', 'tiffin'].includes(kind)) return fail('Invalid period type.');
    if (!isTime(start) || !isTime(end)) return fail(`Enter times like 08:15 for “${label}”.`);
    if (toMin(end) <= toMin(start)) return fail(`“${label}” must end after it starts.`);
    if (before.start_time !== start || before.end_time !== end || before.label !== label) timingChanged = true;
    await query('update periods set label=$2, kind=$3, start_time=$4, end_time=$5, position=$6 where id=$1', [
      id,
      label,
      kind,
      start,
      end,
      Number.isFinite(pos) ? pos : 1,
    ]);
  }
  if (timingChanged) {
    await notifyAllMentors('Period timings updated', `The periods of the ${SECTION_LABELS[section]} routine were changed.`);
  }
  revalidatePath('/routine', 'layout');
  revalidatePath('/my-routine');
  return ok('Periods saved.');
}

export async function addPeriod(section: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireRole('coordinator');
  if (!isSection(section)) return fail('Invalid section.');
  const label = str(fd, 'label', 40);
  const kind = str(fd, 'kind', 10) || 'period';
  const start = str(fd, 'start', 5);
  const end = str(fd, 'end', 5);
  if (!label) return fail('Give the new period a name.');
  if (!['form', 'period', 'tiffin'].includes(kind)) return fail('Invalid period type.');
  if (!isTime(start) || !isTime(end) || toMin(end) <= toMin(start)) return fail('Enter a valid start and end time.');
  const [{ max }] = await query<{ max: number }>('select coalesce(max(position), 0)::int as max from periods where section = $1', [
    section,
  ]);
  await query('insert into periods (section, position, label, kind, start_time, end_time) values ($1,$2,$3,$4,$5,$6)', [
    section,
    max + 1,
    label,
    kind,
    start,
    end,
  ]);
  await notifyAllMentors('Period added', `A new period “${label}” was added to the ${SECTION_LABELS[section]} routine.`);
  revalidatePath('/routine', 'layout');
  return ok('Period added.');
}

export async function deletePeriod(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireRole('coordinator');
  await query('delete from periods where id = $1', [id]);
  revalidatePath('/routine', 'layout');
  revalidatePath('/my-routine');
  return ok('Period removed.');
}
