import { Avatar, PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata = { title: 'Mentor directory' };

export default async function Directory({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const q = ((await searchParams).q ?? '').trim();
  const rows = await query<{
    id: string;
    name: string;
    designation: string;
    email: string;
    has_photo: boolean;
    photo_version: number;
    mobile: string | null;
    form_class: string | null;
  }>(
    `select u.id, u.name, u.designation, u.email, (u.photo is not null) as has_photo, u.photo_version,
            p.data->>'mobile' as mobile,
            (select string_agg(distinct e.class_name, ', ')
               from routine_entries e join periods pr on pr.id = e.period_id
              where e.mentor_id = u.id and pr.kind = 'form' and e.class_name <> '') as form_class
       from users u left join profiles p on p.user_id = u.id
      where u.active = true and 'mentor' = any(u.roles)
        and ($1 = '' or u.name ilike '%' || $1 || '%' or u.designation ilike '%' || $1 || '%')
      order by u.name`,
    [q],
  );

  return (
    <>
      <PageHead title="Mentor directory" sub="Contact any mentor." />
      <form className="searchbar" action="/directory">
        <input className="input" name="q" defaultValue={q} placeholder="Search by name or designation" aria-label="Search" />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="card">
          <p className="muted">No mentors found.</p>
        </div>
      ) : (
        <div className="grid-3">
          {rows.map((m) => (
            <div className="card person" key={m.id}>
              <Avatar id={m.id} name={m.name} has={m.has_photo} v={m.photo_version} size={56} />
              <div className="grow">
                <strong>{m.name}</strong>
                <div className="muted small">{m.designation}</div>
                {m.form_class && <div className="chip chip-green" style={{ marginTop: 6 }}>Form class {m.form_class}</div>}
                <div className="row gap" style={{ marginTop: 10 }}>
                  {m.mobile && (
                    <a className="btn btn-secondary btn-sm" href={`tel:${m.mobile.replace(/\s+/g, '')}`}>
                      Call
                    </a>
                  )}
                  <a className="btn btn-secondary btn-sm" href={`mailto:${m.email}`}>
                    Email
                  </a>
                </div>
                <div className="muted small" style={{ marginTop: 8 }}>
                  {m.mobile && <div>{m.mobile}</div>}
                  <div>{m.email}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
