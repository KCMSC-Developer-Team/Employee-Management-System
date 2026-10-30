import Link from 'next/link';
import { setupDeveloper } from '@/actions/auth';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { DEVELOPER_EMAIL } from '@/lib/config';
import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'First-time setup' };

export default async function SetupPage() {
  const exists = await one('select 1 from users where lower(email) = $1', [DEVELOPER_EMAIL]);
  if (exists) {
    return (
      <>
        <div className="alert alert-ok" style={{ marginTop: 20 }}>The Developer account is already set up.</div>
        <p className="center">
          <Link href="/login">Go to sign in</Link>
        </p>
      </>
    );
  }
  return (
    <>
      <h2 className="center" style={{ marginTop: 20 }}>First-time setup</h2>
      <p className="muted center">
        This creates the Developer account for <strong>{DEVELOPER_EMAIL}</strong>. We will e-mail that address a link to
        choose a password.
      </p>
      <ActionForm action={setupDeveloper} className="stack">
        <SubmitButton className="btn btn-block" pendingText="Sending…">
          Create Developer account
        </SubmitButton>
      </ActionForm>
      <p className="center" style={{ marginTop: 16 }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
