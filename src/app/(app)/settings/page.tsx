import { changePassword, emailMyResetLink } from '@/actions/auth';
import { savePrefs } from '@/actions/misc';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PushToggle } from '@/components/PushToggle';
import { PageHead } from '@/components/ui';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHead title="Settings" sub={user.email || 'No e-mail address'} />

      <div className="grid-2">
        <section className="card">
          <h2>Notifications</h2>
          <p className="muted">Every notification is sent by browser and by e-mail. You may switch one off, but not both.</p>
          <ActionForm action={savePrefs} className="stack">
            <label className="check">
              <input type="checkbox" name="push" defaultChecked={user.notif_push} /> Browser notifications
            </label>
            <label className="check">
              <input type="checkbox" name="email" defaultChecked={user.notif_email} /> E-mail notifications
            </label>
            <div>
              <SubmitButton pendingText="Saving…">Save</SubmitButton>
            </div>
          </ActionForm>
          <hr />
          <h3>This browser</h3>
          <p className="muted small">Browser notifications also need to be switched on for each device you use.</p>
          <PushToggle />
        </section>

        <section className="card">
          <h2>Password</h2>
          <ActionForm action={changePassword} className="stack" resetOnSuccess>
            <div className="field">
              <label htmlFor="current">Current password</label>
              <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
            </div>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" name="password" type="password" className="input" autoComplete="new-password" required />
            </div>
            <div className="field">
              <label htmlFor="confirm">Type the new password again</label>
              <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
            </div>
            <div>
              <SubmitButton pendingText="Saving…">Change password</SubmitButton>
            </div>
          </ActionForm>
          <hr />
          <h3>Forgot your current password?</h3>
          <ActionForm action={emailMyResetLink}>
            <SubmitButton className="btn btn-secondary" pendingText="Sending…">
              E-mail me a reset link
            </SubmitButton>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
