import { sendSetupEmails } from '@/actions/users';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { SelectAllEmployees } from '@/components/SelectAllEmployees';
import { Avatar, EmptyState, PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const metadata = { title: 'Send set-up e-mails' };

export default async function SetupEmailsPage() {
  await requireRole('developer');
  const people = await query<{
    id: string;
    name: string;
    designation: string;
    email: string | null;
    id_no: string | null;
    has_photo: boolean;
    photo_version: number;
    has_password: boolean;
  }>(
    `select id, name, designation, email, id_no, (photo is not null) as has_photo, photo_version,
            (password_hash is not null) as has_password
       from users where active = true
      order by name`,
  );
  const withEmail = people.filter((p) => p.email).length;
  const withoutEmail = people.length - withEmail;

  return (
    <>
      <PageHead
        title="Send set-up e-mails"
        sub={`${withEmail} employee${withEmail === 1 ? '' : 's'} can receive an e-mail${withoutEmail ? ` · ${withoutEmail} ha${withoutEmail === 1 ? 's' : 've'} no e-mail address` : ''}`}
      />

      <section className="card" style={{ marginBottom: 20 }}>
        <h2>What each person receives</h2>
        <p className="muted">
          Each person with an Employee ID receives sign-in instructions: sign in with the Employee ID as both user name and
          password, then change the password in Settings. Anyone without an ID number receives a one-time link, valid for 7 days,
          to choose a password.
        </p>
      </section>

      {people.length === 0 ? (
        <div className="card">
          <EmptyState title="No active employees" description="Active employee accounts will appear here." />
        </div>
      ) : (
        <ActionForm
          action={sendSetupEmails}
          confirm="Send the set-up e-mail to the selected employees now?"
          className="card table-wrap"
        >
          <div className="row between" style={{ padding: 14, borderBottom: '1px solid var(--color-border)' }}>
            <span className="muted">Tick the people who should receive the e-mail.</span>
            <SubmitButton className="btn" pendingText="Sending…">Send to selected</SubmitButton>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th><SelectAllEmployees count={withEmail} /></th>
                <th>Name</th>
                <th>Designation</th>
                <th>E-mail</th>
                <th>Sign-in ID</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className={p.email ? '' : 'dim'}>
                  <td>
                    <input
                      type="checkbox"
                      name="employeeIds"
                      value={p.id}
                      aria-label={`Send to ${p.name}`}
                      disabled={!p.email}
                      title={p.email ? undefined : 'No e-mail address on file'}
                    />
                  </td>
                  <td>
                    <div className="row gap">
                      <Avatar id={p.id} name={p.name} has={p.has_photo} v={p.photo_version} size={34} />
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>{p.designation}</td>
                  <td>{p.email || <span className="chip chip-gold">No e-mail</span>}</td>
                  <td>{p.id_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ActionForm>
      )}
    </>
  );
}
