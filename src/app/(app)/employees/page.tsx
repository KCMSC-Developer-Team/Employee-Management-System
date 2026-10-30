import Link from 'next/link';
import { Avatar, EmptyState, PageHead } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { SelectAllEmployees } from '@/components/SelectAllEmployees';
import { bulkDeleteEmployees } from '@/actions/users';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { can, isDeveloper, ROLE_LABELS } from '@/lib/roles';
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
    wing: string | null;
    roles: Role[];
    active: boolean;
    has_photo: boolean;
    photo_version: number;
    has_password: boolean;
  }>(
    `select id, name, designation, email, id_no, wing, roles, active, (photo is not null) as has_photo, photo_version,
            (password_hash is not null) as has_password
       from users
      where ($1 = '' or name ilike '%' || $1 || '%' or designation ilike '%' || $1 || '%' or coalesce(email, '') ilike '%' || $1 || '%' or coalesce(id_no, '') ilike '%' || $1 || '%')
      order by active desc, name`,
    [q],
  );
  const manager = can(actor.roles, 'it');
  const developer = isDeveloper(actor.roles);

  const employeeTable = (
    <table className="table">
      <thead>
        <tr>
          {developer && <th><SelectAllEmployees count={rows.length} /></th>}
          <th>Name</th>
          <th>Designation</th>
          <th>ID number</th>
          <th>Wing</th>
          <th>E-mail</th>
          {manager && <th>Access</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={(developer ? 1 : 0) + 6 + (manager ? 1 : 0)}><EmptyState title="No employees found" description={q ? 'Try a different name, ID, designation or e-mail.' : 'Employees will appear here when accounts are created.'} /></td>
          </tr>
        )}
        {rows.map((u) => (
          <tr key={u.id} className={u.active ? '' : 'dim'}>
            {developer && (
              <td>
                <input
                  type="checkbox"
                  name="employeeIds"
                  value={u.id}
                  aria-label={`Select ${u.name}`}
                  disabled={u.id === actor.id}
                  title={u.id === actor.id ? 'You cannot delete your own account.' : undefined}
                />
              </td>
            )}
            <td>
              <Link href={`/employees/${u.id}`} className="row gap plain-link">
                <Avatar id={u.id} name={u.name} has={u.has_photo} v={u.photo_version} size={34} />
                <strong>{u.name}</strong>
              </Link>
            </td>
            <td>{u.designation}</td>
            <td>{u.id_no || '—'}</td>
            <td>{u.wing ? (u.wing === 'junior' ? 'Junior' : 'Senior') : 'Unassigned'}</td>
            <td>{u.email || '—'}</td>
            {manager && (
              <td>
                <div className="chips">
                  {u.roles.map((r) => <span className="chip" key={r}>{ROLE_LABELS[r]}</span>)}
                  {!u.active && <span className="chip chip-red">Inactive</span>}
                  {u.active && !u.has_password && <span className="chip chip-gold">Invite pending</span>}
                </div>
              </td>
            )}
            <td><Link href={`/employees/${u.id}`}>Open</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

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

      <form className="searchbar employee-search" action="/employees">
        <label className="sr-only" htmlFor="employee-search">Search employees</label>
        <input id="employee-search" className="input" name="q" defaultValue={q} placeholder="Search by name, designation, e-mail or ID" aria-label="Search employees" />
        <button className="btn" type="submit">
          Search
        </button>
        {q && <Link className="btn btn-ghost" href="/employees">Clear</Link>}
      </form>

      {developer ? (
        <ActionForm
          action={bulkDeleteEmployees}
          confirm="Permanently delete the selected employee accounts and all their data?"
          className="card table-wrap"
        >
          <div className="row gap" style={{ marginBottom: 12 }}>
            <SubmitButton className="btn btn-danger" pendingText="Deleting…">Delete selected</SubmitButton>
            <span className="muted small">Select employees below. Profiles and routine entries are removed with the account.</span>
          </div>
          {employeeTable}
        </ActionForm>
      ) : (
        <div className="card table-wrap">{employeeTable}</div>
      )}
    </>
  );
}
