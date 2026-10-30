import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { can } from '@/lib/roles';
import { DAY_NAMES, fmtRange, SECTION_LABELS, toMin } from '@/lib/routine';
import type { Section } from '@/lib/types';
import { dhakaNow, fmtDate } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };

type Row = { section: Section; class_name: string; label: string; kind: string; start_time: string; end_time: string };

export default async function Dashboard() {
  const user = await requireUser();
  const r = user.roles;
  const now = dhakaNow();
  const isMentor = r.includes('mentor');

  const [objections, approvals, employees, today, forms] = await Promise.all([
    one<{ n: number }>('select count(*)::int as n from objections where user_id = $1 and read_at is null', [user.id]),
    can(r, 'it', 'authority')
      ? one<{ n: number }>(`select count(*)::int as n from profile_edits where status='pending' and user_id <> $1`, [user.id])
      : Promise.resolve(null),
    can(r, 'it', 'authority') ? one<{ n: number }>('select count(*)::int as n from users where active = true') : Promise.resolve(null),
    isMentor
      ? query<Row>(
          `select e.section, e.class_name, p.label, p.kind, p.start_time, p.end_time
             from routine_entries e join periods p on p.id = e.period_id
            where e.mentor_id = $1 and e.day = $2 and e.class_name <> '' order by p.start_time`,
          [user.id, now.day],
        )
      : Promise.resolve([] as Row[]),
    isMentor
      ? query<{ class_name: string }>(
          `select distinct e.class_name from routine_entries e join periods p on p.id = e.period_id
            where e.mentor_id = $1 and p.kind = 'form' and e.class_name <> ''`,
          [user.id],
        )
      : Promise.resolve([] as { class_name: string }[]),
  ]);

  const next = today.find((t) => toMin(t.end_time) > now.minutes);
  const ongoing = next && toMin(next.start_time) <= now.minutes;

  return (
    <>
      <PageHead title={`Hello, ${user.name.split(' ')[0]}`} sub={`${user.designation} · ${DAY_NAMES[now.day]}, ${fmtDate(now.date)}`} />

      <div className="grid-3">
        {isMentor && (
          <div className="card stat">
            <div className="stat-label">{ongoing ? 'Class now' : 'Your next class today'}</div>
            {next ? (
              <>
                <div className="stat-value">{next.class_name}</div>
                <div className="muted">
                  {next.kind === 'form' ? 'Form class' : next.label} · {fmtRange(next)}
                </div>
              </>
            ) : (
              <div className="muted">No more classes today.</div>
            )}
          </div>
        )}
        {isMentor && (
          <div className="card stat">
            <div className="stat-label">Your form class</div>
            {forms.length ? (
              <div className="stat-value">{forms.map((f) => f.class_name).join(', ')}</div>
            ) : (
              <div className="muted">Not assigned yet.</div>
            )}
          </div>
        )}
        <Link href="/objections" className={`card stat link-card ${objections?.n ? 'stat-alert' : ''}`}>
          <div className="stat-label">Unread objections</div>
          <div className="stat-value">{objections?.n ?? 0}</div>
        </Link>
        {approvals && (
          <Link href="/approvals" className="card stat link-card">
            <div className="stat-label">Profile changes to approve</div>
            <div className="stat-value">{approvals.n}</div>
          </Link>
        )}
        {employees && (
          <Link href="/employees" className="card stat link-card">
            <div className="stat-label">Active employees</div>
            <div className="stat-value">{employees.n}</div>
          </Link>
        )}
      </div>

      {isMentor && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="row between">
            <h2>Today’s classes</h2>
            <Link href="/my-routine">Full routine</Link>
          </div>
          {today.length === 0 ? (
            <p className="muted">You have no classes today.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Section</th>
                </tr>
              </thead>
              <tbody>
                {today.map((t, i) => (
                  <tr key={i}>
                    <td>{t.label}</td>
                    <td>{fmtRange(t)}</td>
                    <td>
                      <strong>{t.class_name}</strong>
                    </td>
                    <td>{SECTION_LABELS[t.section]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Need help?</h2>
        <p className="muted">
          Press the round <span className="chip">i</span> button at the top of any page. It explains that page step by step.
        </p>
      </div>
    </>
  );
}
