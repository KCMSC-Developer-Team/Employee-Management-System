import Link from 'next/link';
import { Avatar, EmptyState, PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { DAY_NAMES, DAY_ORDER, fmtRange, SECTION_LABELS } from '@/lib/routine';
import type { Period, Section } from '@/lib/types';
import { dhakaNow } from '@/lib/utils';

export const metadata = { title: 'My routine' };

export default async function MyRoutine({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = dhakaNow().day;
  const wanted = sp.day !== undefined ? Number(sp.day) : today;
  const day = DAY_ORDER.includes(wanted) ? wanted : DAY_ORDER[0];

  const [periods, mine] = await Promise.all([
    query<Period>('select * from periods order by section, position'),
    query<{ section: Section; day: number; period_id: string; class_name: string }>(
      'select section, day, period_id, class_name from routine_entries where mentor_id = $1',
      [user.id],
    ),
  ]);

  const periodById = new Map(periods.map((period) => [period.id, period]));
  const forms = Array.from(new Set(mine.filter((entry) => periodById.get(entry.period_id)?.kind === 'form').map((entry) => entry.class_name)));
  const sections = (['junior', 'senior'] as Section[]).filter((section) => mine.some((entry) => entry.section === section));
  const teachingPeriods = mine.filter((entry) => periodById.get(entry.period_id)?.kind === 'period').length;
  const dayEntries = new Map(mine.filter((entry) => entry.day === day).map((entry) => [`${entry.section}:${entry.period_id}`, entry.class_name]));

  return (
    <>
      <PageHead title="My routine" sub="Your assigned weekly teaching schedule." />

      <section className="routine-profile card">
        <Avatar id={user.id} name={user.name} has={user.has_photo} v={user.photo_version} size={52} />
        <div className="routine-profile-main">
          <h2>{user.name}</h2>
          <p className="muted">{user.designation} <span aria-hidden="true">·</span> Weekly schedule</p>
        </div>
        <div className="routine-profile-meta">
          <span className="routine-meta-label">Teaching periods</span>
          <strong>{teachingPeriods}</strong>
        </div>
        <div className="routine-profile-meta">
          <span className="routine-meta-label">Form class</span>
          <strong>{forms.length ? forms.join(', ') : 'Not assigned'}</strong>
        </div>
      </section>

      <nav className="schedule-day-nav" aria-label="Choose a day">
        {DAY_ORDER.map((dayIndex) => {
          const selected = dayIndex === day;
          const isToday = dayIndex === today;
          return (
            <Link
              key={dayIndex}
              href={`/my-routine?day=${dayIndex}`}
              className={`schedule-day${selected ? ' active' : ''}${isToday ? ' is-today' : ''}`}
              aria-current={selected ? 'page' : undefined}
            >
              <span>{DAY_NAMES[dayIndex]}</span>
              {isToday && <small>Today</small>}
            </Link>
          );
        })}
      </nav>

      {sections.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Your schedule is being prepared"
            description="Classes will appear here after a Routine Coordinator assigns them to your employee account."
          />
        </div>
      ) : (
        <div className="schedule-sections">
          {sections.map((section) => {
            const rows = periods.filter((period) => period.section === section);
            const dayHasClasses = rows.some((period) => dayEntries.has(`${section}:${period.id}`));
            return (
              <section className="card schedule-panel" key={section}>
                <header className="schedule-panel-header">
                  <div>
                    <p className="eyebrow">{SECTION_LABELS[section]}</p>
                    <h2>{DAY_NAMES[day]}</h2>
                  </div>
                  {day === today && <span className="chip chip-green">Today</span>}
                </header>
                {!dayHasClasses ? (
                  <EmptyState title="No classes scheduled" description={`There are no assigned classes for ${DAY_NAMES[day]} in the ${SECTION_LABELS[section]}.`} />
                ) : (
                  <ol className="schedule-list">
                    {rows.map((period) => {
                      const className = dayEntries.get(`${section}:${period.id}`);
                      const isBreak = period.kind === 'tiffin';
                      return (
                        <li className={`schedule-row${isBreak ? ' is-break' : ''}${className ? ' has-class' : ''}`} key={period.id}>
                          <div className="schedule-time">{fmtRange(period)}</div>
                          <div className="schedule-marker" aria-hidden="true" />
                          <div className="schedule-detail">
                            <div className="schedule-period">{period.label}</div>
                            <div className={className ? 'schedule-class' : 'schedule-empty'}>
                              {className || (isBreak ? 'Break' : period.kind === 'form' ? 'Form class not assigned' : 'No class assigned')}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
