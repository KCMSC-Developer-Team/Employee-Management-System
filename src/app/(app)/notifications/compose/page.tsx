import Link from 'next/link';
import { sendCustomNotification } from '@/actions/misc';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PageHead } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { ALL_ROLES, ROLE_LABELS } from '@/lib/roles';

export const metadata = { title: 'Send notification' };

export default async function ComposeNotificationPage() {
  await requireRole('developer');
  return (
    <>
      <PageHead title="Send a notification" sub="Send a message to everyone or to users with a selected role.">
        <Link className="btn btn-secondary" href="/notifications">Back to notifications</Link>
      </PageHead>
      <section className="card settings-section">
        <ActionForm action={sendCustomNotification} className="stack" resetOnSuccess>
          <div className="field">
            <label htmlFor="audience">Send to</label>
            <select id="audience" name="audience" className="input" defaultValue="everyone">
              <option value="everyone">Everyone</option>
              {ALL_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="notice-title">Title</label>
            <input id="notice-title" name="title" className="input" maxLength={120} required />
          </div>
          <div className="field">
            <label htmlFor="notice-body">Message</label>
            <textarea id="notice-body" name="body" className="input" rows={5} maxLength={2000} required />
          </div>
          <div><SubmitButton pendingText="Sending…">Send notification</SubmitButton></div>
        </ActionForm>
        <p className="muted small" style={{ marginTop: 12 }}>Notifications appear in the system and are also sent by browser push and e-mail when recipients have those options enabled.</p>
      </section>
    </>
  );
}
