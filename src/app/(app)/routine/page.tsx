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
  const filledSlots = entries.filter((entry) => entry.section === section && entry.class_name.trim()).length;

  return (
    <>
      <PageHead title="Routine editor" sub="Type the class and section in each cell. Clashes are marked in red.">
        <Link className="btn btn-secondary" href={`/routine/periods?section=${section}`}>
          Edit periods and times
        </Link>
      </PageHead>

      <div className="routine-toolbar">
        <nav className="seg" aria-label="Choose a wing">
          {(['junior', 'senior'] as Section[]).map((s) => (
            <Link key={s} href={`/routine?section=${s}&day=${day}`} className={s === section ? 'active' : ''} aria-current={s === section ? 'page' : undefined}>
              {SECTION_LABELS[s]}
            </Link>
          ))}
        </nav>
        <nav className="routine-day-nav" aria-label="Choose a day">
          {DAY_ORDER.map((d) => (
            <Link key={d} href={`/routine?section=${section}&day=${d}`} className={d === day ? 'active' : ''} aria-current={d === day ? 'page' : undefined}>
              {DAY_NAMES[d]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="card">
        <div className="routine-editor-summary">
          <div><span className="eyebrow">Daily assignments</span><h2>{DAY_NAMES[day]} <span className="muted">· {SECTION_LABELS[section]}</span></h2></div>
          <div className="routine-summary-metrics">
            <div><strong>{mentors.length}</strong><span>Mentors</span></div>
            <div><strong>{filledSlots}</strong><span>Filled periods</span></div>
          </div>
        </div>
        {mentors.length === 0 ? (
          <div className="routine-editor-empty">
            <p className="eyebrow">{SECTION_LABELS[section]}</p>
            <h3>No mentors assigned to this wing</h3>
            <p className="muted">Ask an IT Technician to assign the correct wing on mentor employee accounts.</p>
          </div>
        ) : mine.length === 0 ? (
          <div className="routine-editor-empty">
            <h3>No periods configured</h3>
            <p className="muted">Add periods and their times before assigning classes.</p>
            <Link className="btn btn-secondary btn-sm" href={`/routine/periods?section=${section}`}>Edit periods and times</Link>
          </div>
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
