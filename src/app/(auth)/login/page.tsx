import Link from 'next/link';
import { redirect } from 'next/navigation';
import { login } from '@/actions/auth';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { getUser } from '@/lib/auth';
import { DEVELOPER_EMAIL } from '@/lib/config';
import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  if (await getUser()) redirect('/dashboard');
  const { done } = await searchParams;
  const devExists = await one('select 1 from users where lower(email) = $1', [DEVELOPER_EMAIL]);
  return (
    <>
      {!devExists && (
        <div className="alert alert-warn" style={{ marginBottom: 14 }}>
          <strong>First time here?</strong> <Link href="/setup">Set up the Developer account</Link>
        </div>
      )}
      {done && <div className="alert alert-ok">Your password was saved. Please sign in.</div>}
      <ActionForm action={login} className="stack">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" autoComplete="username" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        <SubmitButton className="btn btn-block" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </ActionForm>
      <p className="center" style={{ marginTop: 16 }}>
        <Link href="/forgot">Forgot password?</Link>
      </p>
    </>
  );
}
