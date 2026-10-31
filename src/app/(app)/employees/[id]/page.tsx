import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addObjection } from '@/actions/misc';
import { saveAdminFields } from '@/actions/profile';
import { deleteUser, sendInvite, updateUser } from '@/actions/users';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PrintButton } from '@/components/PrintButton';
import { Avatar, FieldInput, ObjectionRecords, PageHead, ProfileSheet, type ObjectionRecord } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { one, query } from '@/lib/db';
import { ADMIN_KEYS, FIELD_BY_KEY } from '@/lib/profile-fields';
import { assignableRoles, can, isDeveloper, ROLE_LABELS } from '@/lib/roles';
import type { Role } from '@/lib/types';
import { fmtDateTime } from '@/lib/utils';

export const metadata = { title: 'Employee' };

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole('it', 'authority');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const target = await one<{
    id: string;
    name: string;
    email: string | null;
    id_no: string | null;
    designation: string;
    wing: string | null;
    roles: Role[];
    active: boolean;
    has_photo: boolean;
    photo_version: number;
    has_password: boolean;
  }>(
    `select id, name, email, id_no, wing, designation, roles, active, (photo is not null) as has_photo, photo_version,
            (password_hash is not null) as has_password from users where id = $1`,
    [id],
  );
  if (!target) notFound();

  const protectedTarget = target.roles.includes('developer') && !isDeveloper(actor.roles);
  const canManage = can(actor.roles, 'it') && !protectedTarget;
  const canDetails = can(actor.roles, 'authority'); // Authority (and Developer) read the full sheet
  const canObject = can(actor.roles, 'authority');

  const profile = await one<{ data: Record<string, string> }>('select data from profiles where user_id = $1', [id]);
  const data = profile?.data ?? {};

  // Developer and Authority see every objection on this employee.
  const objections = canObject
    ? await query<ObjectionRecord & { read_at: string | null }>(
        `select o.id, o.subject, o.body, o.created_at, o.read_at, a.name as author
           from objections o left join users a on a.id = o.author_id
          where o.user_id = $1
          order by o.created_at desc`,
        [id],
      )
    : [];

  const mine = assignableRoles(actor.roles);
  const hidden = target.roles.filter((r) => !mine.includes(r));

  return (
    <>
      <PageHead title="Employee profile" sub="Staff record and account access">
        <Link className="btn btn-secondary no-print" href="/employees">
          ← All employees
        </Link>
        {canDetails && <PrintButton label="Print profile" />}
      </PageHead>

      <section className="card employee-summary no-print">
        <Avatar id={target.id} name={target.name} has={target.has_photo} v={target.photo_version} size={62} />
        <div className="employee-summary-main">
          <h2>{target.name}</h2>
          <p className="muted">{target.designation}</p>
        </div>
        <div className="employee-summary-facts">
          <div><span>Employee ID</span><strong>{target.id_no || 'Not set'}</strong></div>
          <div><span>Wing</span><strong>{target.wing === 'junior' ? 'Junior' : target.wing === 'senior' ? 'Senior' : 'Unassigned'}</strong></div>
          <div><span>E-mail</span><strong>{target.email || 'Not provided'}</strong></div>
        </div>
        <div className="employee-summary-status">
          <span className={`chip ${target.active ? 'chip-green' : 'chip-red'}`}>{target.active ? 'Active' : 'Inactive'}</span>
          <span className={`chip ${target.has_password ? 'chip-grey' : 'chip-gold'}`}>{target.has_password ? 'Password set' : 'Setup pending'}</span>
        </div>
      </section>

      {canDetails ? (
        <div className="card print-area">
          <ProfileSheet
            data={data}
            header={
              <div className="sheet-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" width={56} height={62} />
                <div className="grow">
                  <div className="school">K C MODEL SCHOOL &amp; COLLEGE</div>
                  <div className="doc">Profile and Performance Sheet</div>
                </div>
                <Avatar id={target.id} name={target.name} has={target.has_photo} v={target.photo_version} size={84} />
              </div>
            }
          />
          <div className="print-only">
            <ObjectionRecords items={objections} title="Objections" />
          </div>
          <dl className="kv sheet-basic">
            <div>
              <dt>Full name (in English)</dt>
              <dd>{target.name}</dd>
            </div>
            <div>
              <dt>Designation</dt>
              <dd>{target.designation}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{target.email || '—'}</dd>
            </div>
            <div>
              <dt>ID number</dt>
              <dd>{target.id_no || '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="grid-2 no-print" style={{ marginTop: 20 }}>
        {canManage && (
          <section className="card">
            <h2>Account and access</h2>
            <ActionForm action={updateUser.bind(null, target.id)} className="stack">
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input id="name" name="name" className="input" defaultValue={target.name} required />
              </div>
              <div className="field">
                <label htmlFor="designation">Designation</label>
                <input id="designation" name="designation" className="input" defaultValue={target.designation} required />
              </div>
              <div className="field">
                <label htmlFor="wing">Wing</label>
                <select id="wing" name="wing" className="input" defaultValue={target.wing || ''} required>
                  <option value="" disabled>Choose a wing</option>
                  <option value="junior">Junior</option>
                  <option value="senior">Senior</option>
                </select>
                {!target.wing && <p className="muted small">Assign a wing to include this employee in the correct routine editor.</p>}
              </div>
              <div className="field">
                <label>Roles</label>
                <div className="checks">
                  {mine.map((r) => (
                    <label className="check" key={r}>
                      <input type="checkbox" name="roles" value={r} defaultChecked={target.roles.includes(r)} />
                      {ROLE_LABELS[r]}
                    </label>
                  ))}
                </div>
                {hidden.length > 0 && <p className="muted small">This person also holds roles that only a Developer can change.</p>}
              </div>
              <label className="check">
                <input type="checkbox" name="active" defaultChecked={target.active} /> Account is active (can sign in)
              </label>
              <div>
                <SubmitButton pendingText="Saving…">Save</SubmitButton>
              </div>
            </ActionForm>
            <hr />
            <ActionForm action={sendInvite.bind(null, target.id)}>
              <p className="muted small">
                {target.has_password ? 'Sends a link to choose a new password.' : 'This person has not set a password yet. Sends the invitation again.'}
              </p>
              <SubmitButton className="btn btn-secondary" pendingText="Sending…">
                {target.has_password ? 'Send password reset link' : 'Send set-password link'}
              </SubmitButton>
            </ActionForm>
            {isDeveloper(actor.roles) && target.id !== actor.id && (
              <>
                <hr />
                <ActionForm action={deleteUser.bind(null, target.id)} confirm={`Permanently delete ${target.name} and all their data?`}>
                  <SubmitButton className="btn btn-danger" pendingText="Deleting…">
                    Delete account
                  </SubmitButton>
                </ActionForm>
              </>
            )}
          </section>
        )}

        <section className="card">
          <h2>Administration fields</h2>
          <p className="muted small">ID No., joining date, position and supervisor.</p>
          <ActionForm action={saveAdminFields.bind(null, target.id)} className="stack">
            <div className="form-grid">
              {ADMIN_KEYS.map((k) => (
                <FieldInput key={k} field={FIELD_BY_KEY[k]} value={data[k]} />
              ))}
            </div>
            <div>
              <SubmitButton pendingText="Saving…">Save</SubmitButton>
            </div>
          </ActionForm>
        </section>
      </div>

      {canObject && (
        <section className="card no-print" style={{ marginTop: 20 }}>
          <h2>Objections</h2>
          <p className="muted">Only the Developer, Authorities and {target.name.split(' ')[0]} can read these. {target.name.split(' ')[0]} is notified when one is added.</p>
          <ActionForm action={addObjection.bind(null, target.id)} className="stack" resetOnSuccess>
            <div className="field">
              <label htmlFor="subject">Subject</label>
              <input id="subject" name="subject" className="input" maxLength={150} required />
            </div>
            <div className="field">
              <label htmlFor="body">Details</label>
              <textarea id="body" name="body" className="input" rows={4} maxLength={3000} required />
            </div>
            <div>
              <SubmitButton pendingText="Adding…">Add objection</SubmitButton>
            </div>
          </ActionForm>
          {objections.length > 0 && (
            <div className="stack" style={{ marginTop: 20 }}>
              {objections.map((o) => (
                <article key={o.id} className="mini-card">
                  <div className="row between">
                    <strong>{o.subject}</strong>
                    <span className={`chip ${o.read_at ? '' : 'chip-gold'}`}>{o.read_at ? 'Read' : 'Not read yet'}</span>
                  </div>
                  <p className="muted small">
                    {fmtDateTime(o.created_at)}
                    {o.author ? ` · by ${o.author}` : ''}
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{o.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
