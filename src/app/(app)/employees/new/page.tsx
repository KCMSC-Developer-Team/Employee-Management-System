import { createUser } from '@/actions/users';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { assignableRoles, ROLE_LABELS } from '@/lib/roles';

export const metadata = { title: 'Add employee' };

export default async function NewEmployee() {
  const actor = await requireRole('it');
  const roles = assignableRoles(actor.roles);
  return (
    <>
      <PageHead title="Add an employee" sub="They can sign in with their ID number; their initial password is the same ID." />
      <div className="card" style={{ maxWidth: 680 }}>
        <ActionForm action={createUser} className="stack" resetOnSuccess>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Full name <span className="req">*</span></label>
              <input id="name" name="name" className="input" required />
            </div>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" className="input" />
            </div>
            <div className="field">
              <label htmlFor="id_no">ID number <span className="req">*</span></label>
              <input id="id_no" name="id_no" className="input" required />
            </div>
            <div className="field">
              <label htmlFor="wing">Wing</label>
              <select id="wing" name="wing" className="input" defaultValue="">
                <option value="">Not assigned yet</option>
                <option value="junior">Junior</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="designation">Designation <span className="req">*</span></label>
              <input id="designation" name="designation" className="input" placeholder="e.g. Assistant Teacher" required />
            </div>
            <div className="field">
              <label htmlFor="mobile">Mobile number</label>
              <input id="mobile" name="mobile" className="input" />
            </div>
          </div>
          <div className="field">
            <label>Roles <span className="req">*</span></label>
            <div className="checks">
              {roles.map((r) => (
                <label className="check" key={r}>
                  <input type="checkbox" name="roles" value={r} /> {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
            <p className="muted small">
              The person sees only their designation, never their roles.
              {roles.length < 5 && ' Only a Developer can create Developer or IT Technician accounts.'}
            </p>
          </div>
          <div>
            <SubmitButton pendingText="Creating…">Create account</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
