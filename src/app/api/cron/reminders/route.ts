import { query } from '@/lib/db';
import { notify } from '@/lib/notify';
import { fmtTime, SECTION_LABELS, toMin } from '@/lib/routine';
import type { Section } from '@/lib/types';
import { dhakaNow } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const LEAD_MINUTES = 10; // remind this long before a period starts

/**
 * Call this every 5 minutes (see README → “Class reminders”).
 * Authorised with  Authorization: Bearer <CRON_SECRET>  (or ?key=<CRON_SECRET>).
 * Each mentor is reminded once per class per day.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('key');
  if (!secret || given !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const now = dhakaNow();
  const rows = await query<{
    mentor_id: string;
    class_name: string;
    section: Section;
    period_id: string;
    label: string;
    kind: string;
    start_time: string;
  }>(
    `select e.mentor_id, e.class_name, e.section, p.id as period_id, p.label, p.kind, p.start_time
       from routine_entries e join periods p on p.id = e.period_id
      where e.day = $1 and e.class_name <> ''`,
    [now.day],
  );

  const due = rows.filter((r) => {
    const delta = toMin(r.start_time) - now.minutes;
    return delta > 0 && delta <= LEAD_MINUTES;
  });

  let sent = 0;
  for (const r of due) {
    const fresh = await query(
      `insert into reminder_log (mentor_id, period_id, on_date) values ($1,$2,$3)
       on conflict do nothing returning mentor_id`,
      [r.mentor_id, r.period_id, now.date],
    );
    if (fresh.length === 0) continue;
    const what = r.kind === 'form' ? 'Form class' : r.label;
    await notify([r.mentor_id], {
      title: `Next: ${what} — ${r.class_name}`,
      body: `${what} for ${r.class_name} (${SECTION_LABELS[r.section]}) starts at ${fmtTime(r.start_time)}.`,
      url: '/my-routine',
    });
    sent++;
  }
  return Response.json({ ok: true, checked: rows.length, reminded: sent });
}
