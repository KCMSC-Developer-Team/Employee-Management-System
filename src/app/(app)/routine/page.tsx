import Link from 'next/link';
import { RoutineGrid } from '@/components/RoutineGrid';
import { PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { DAY_NAMES, DAY_ORDER, SECTION_LABELS } from '@/lib/routine';
import type { Period, Section } from '@/lib/types';
import { dhakaNow } from '@/lib/utils';

export const metadata = { title: 'Routine editor' };

export default async function RoutinePage({ searchParams }: { searchParams: Promise<{ section?: string; day?: string }> }) {
  await requireRole('coordinator');
  const sp = await searchParams;
  const section: Section = sp.section === 'senior' ? 'senior' : 'junior';
  const other: Section = section === 'junior' ? 'senior' : 'junior';
  const wanted = sp.day !== undefined ? Number(sp.day) : dhakaNow().day;
  const day = DAY_ORDER.includes(wanted) ? wanted : DAY_ORDER[0];

  const [periods, mentors, entries, classes] = await Promise.all([
    query<Period>('select * from periods order by section, position'),
    query<{ id: string; name: string; designation: string }>(
      `select id, name, designation from users where active = true and wing = $1 and 'mentor' = any(roles) order by name`,
      [section],
    ),
    query<{ section: Section; mentor_id: string; period_id: string; class_name: string }>(
      'select section, mentor_id, period_id, class_name from routine_entries where day = $1',
      [day],
    ),
    query<{ class_name: string }>('select distinct class_name from routine_entries where section = $1 order by class_name', [section]),
  ]);

  const mine = periods.filter((p) => p.section === section);
  const others = periods.filter((p) => p.section === other);

  return (
    <>
      <PageHead title="Routine editor" sub="Type the class and section in each cell. Clashes are marked in red.">
        <Link className="btn btn-secondary" href={`/routine/periods?section=${section}`}>
          Edit periods and times
        </Link>
      </PageHead>

      <div className="seg" role="tablist">
        {(['junior', 'senior'] as Section[]).map((s) => (
          <Link key={s} href={`/routine?section=${s}&day=${day}`} className={s === section ? 'active' : ''} role="tab" aria-selected={s === section}>
            {SECTION_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="tabs">
        {DAY_ORDER.map((d) => (
          <Link key={d} href={`/routine?section=${section}&day=${d}`} className={d === day ? 'active' : ''} role="tab" aria-selected={d === day}>
            {DAY_NAMES[d]}
          </Link>
        ))}
      </div>

      <div className="card">
        {mentors.length === 0 ? (
          <p className="muted">No {SECTION_LABELS[section]} mentors yet. Add mentors with this wing assigned on their employee account.</p>
        ) : mine.length === 0 ? (
          <p className="muted">This section has no periods. Use “Edit periods and times” to add some.</p>
        ) : (
          <RoutineGrid
            key={`${section}-${day}`}
            section={section}
            day={day}
            periods={mine}
            otherPeriods={others}
            mentors={mentors}
            entries={entries}
            suggestions={classes.map((c) => c.class_name)}
          />
        )}
      </div>
    </>
  );
}
