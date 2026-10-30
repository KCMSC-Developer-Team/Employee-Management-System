import Link from 'next/link';
import { resetPassword } from '@/actions/auth';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { peekToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose a password' };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = token ? await peekToken(token) : null;

  if (!token || !valid) {
    return (
      <>
        <div className="alert alert-err" style={{ marginTop: 20 }}>
          This link has expired or was already used.
        </div>
        <p className="center">
          <Link href="/forgot">Ask for a new link</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="center" style={{ marginTop: 20 }}>Choose your password</h2>
      <p className="muted center">Choose a password of any length.</p>
      <ActionForm action={resetPassword} className="stack">
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="confirm">Type it again</label>
          <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
        </div>
        <SubmitButton className="btn btn-block" pendingText="Saving…">
          Save password
        </SubmitButton>
      </ActionForm>
    </>
  );
}
