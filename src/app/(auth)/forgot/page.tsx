import Link from 'next/link';
import { forgotPassword } from '@/actions/auth';
import { ActionForm, SubmitButton } from '@/components/ActionForm';

export const metadata = { title: 'Forgot password' };

export default function ForgotPage() {
  return (
    <>
      <h2 className="center" style={{ marginTop: 20 }}>Forgot your password?</h2>
      <p className="muted center">Enter your e-mail. We will send you a link to choose a new password.</p>
      <ActionForm action={forgotPassword} className="stack">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" required autoFocus />
        </div>
        <SubmitButton className="btn btn-block" pendingText="Sending…">
          Send reset link
        </SubmitButton>
      </ActionForm>
      <p className="center" style={{ marginTop: 16 }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </>
  );
}
