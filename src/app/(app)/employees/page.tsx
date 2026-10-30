import Link from 'next/link';
import { Avatar, PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { can, ROLE_LABELS } from '@/lib/roles';
import type { Role } from '@/lib/types';

export const metadata = { title: 'Employees' };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireRole('it', 'authority');
  const q = ((await searchParams).q ?? '').trim();
  const rows = await query<{
    id: string;
    name: string;
    designation: string;
    email: string | null;
    id_no: string | null;
    roles: Role[];
    active: boolean;
    has_photo: boolean;
    photo_version: number;
    has_password: boolean;
  }>(
    `select id, name, designation, email, id_no, roles, active, (photo is not null) as has_photo, photo_version,
            (password_hash is not null) as has_password
       from users
      where ($1 = '' or name ilike '%' || $1 || '%' or designation ilike '%' || $1 || '%' or coalesce(email, '') ilike '%' || $1 || '%' or coalesce(id_no, '') ilike '%' || $1 || '%')
      order by active desc, name`,
    [q],
  );
  const manager = can(actor.roles, 'it');

  return (
    <>
      <PageHead title="Employees" sub={`${rows.length} ${rows.length === 1 ? 'person' : 'people'}`}>
        {can(actor.roles, 'authority') && (
          <Link className="btn btn-secondary" href="/employees/print">
            Print all profiles
          </Link>
        )}
        {manager && (
          <>
            <Link className="btn btn-secondary" href="/employees/import">
              Import spreadsheet
            </Link>
            <Link className="btn" href="/employees/new">
              Add employee
            </Link>
          </>
        )}
      </PageHead>

      <form className="searchbar" action="/employees">
        <input className="input" name="q" defaultValue={q} placeholder="Search by name, designation, e-mail or ID" aria-label="Search" />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>ID number</th>
              <th>E-mail</th>
              {manager && <th>Access</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No one found.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'dim'}>
                <td>
                  <Link href={`/employees/${u.id}`} className="row gap plain-link">
                    <Avatar id={u.id} name={u.name} has={u.has_photo} v={u.photo_version} size={34} />
                    <strong>{u.name}</strong>
                  </Link>
                </td>
                <td>{u.designation}</td>
                <td>{u.id_no || '—'}</td>
                <td>{u.email || '—'}</td>
                {manager && (
                  <td>
                    <div className="chips">
                      {u.roles.map((r) => (
                        <span className="chip" key={r}>
                          {ROLE_LABELS[r]}
                        </span>
                      ))}
                      {!u.active && <span className="chip chip-red">Inactive</span>}
                      {u.active && !u.has_password && <span className="chip chip-gold">Invite pending</span>}
                    </div>
                  </td>
                )}
                <td>
                  <Link href={`/employees/${u.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
