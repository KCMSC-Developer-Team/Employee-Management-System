import Link from 'next/link';
import { verifyEmailChange } from '@/actions/auth';
import { ActionForm, SubmitButton } from '@/components/ActionForm';

export const metadata = { title: 'Verify e-mail' };
export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h2 className="center" style={{ marginTop: 20 }}>Verify e-mail address</h2>
      <p className="muted center">Confirm this e-mail address to use it for your account.</p>
      {token ? (
        <ActionForm action={verifyEmailChange} className="stack">
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="btn btn-block" pendingText="Verifying…">Verify e-mail address</SubmitButton>
        </ActionForm>
      ) : (
        <div className="alert alert-err" role="alert">This verification link is invalid. Request a new one from Settings.</div>
      )}
      <p className="center" style={{ marginTop: 16 }}><Link href="/settings">Return to Settings</Link></p>
    </>
  );
}
