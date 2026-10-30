import Link from 'next/link';
import { PageHead } from '@/components/ui';
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

  const forms = Array.from(
    new Set(
      mine
        .filter((e) => periods.find((p) => p.id === e.period_id)?.kind === 'form')
        .map((e) => e.class_name),
    ),
  );
  const sections = (['junior', 'senior'] as Section[]).filter((s) => mine.some((e) => e.section === s));

  return (
    <>
      <PageHead title="My routine" sub="Worked out automatically from the main routine." />

      <div className="card stat" style={{ maxWidth: 360 }}>
        <div className="stat-label">Your form class</div>
        {forms.length ? <div className="stat-value">{forms.join(', ')}</div> : <div className="muted">Not assigned yet.</div>}
      </div>

      <div className="tabs" role="tablist" style={{ marginTop: 20 }}>
        {DAY_ORDER.map((d) => (
          <Link key={d} href={`/my-routine?day=${d}`} className={d === day ? 'active' : ''} role="tab" aria-selected={d === day}>
            {DAY_NAMES[d]}
            {d === today && <span className="today"> · today</span>}
          </Link>
        ))}
      </div>

      {sections.length === 0 ? (
        <div className="card">
          <p className="muted">No classes have been assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid-2">
          {sections.map((s) => {
            const rows = periods.filter((p) => p.section === s);
            const entry = (pid: string) => mine.find((e) => e.section === s && e.day === day && e.period_id === pid)?.class_name;
            return (
              <div className="card" key={s}>
                <h2>
                  {DAY_NAMES[day]} <span className="muted">· {SECTION_LABELS[s]}</span>
                </h2>
                <table className="table routine-mine">
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className={p.kind === 'tiffin' ? 'tiffin' : ''}>
                        <th scope="row">
                          <div>{p.label}</div>
                          <div className="muted small">{fmtRange(p)}</div>
                        </th>
                        <td>{entry(p.id) ? <strong>{entry(p.id)}</strong> : <span className="muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
