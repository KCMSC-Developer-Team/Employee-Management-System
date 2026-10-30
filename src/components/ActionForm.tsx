'use client';

import { createContext, useContext, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import type { FormState } from '@/lib/types';

const PendingCtx = createContext(false);

export function SubmitButton({
  children,
  className = 'btn',
  pendingText = 'Please wait…',
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
}) {
  const pending = useContext(PendingCtx);
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * A form that calls a server action and shows its message underneath.
 * Unlike a plain <form action>, it keeps what the person typed when there is an error.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(form, submitter as any);
    start(async () => {
      const result = await action(null, fd);
      setState(result);
      if (result?.ok && resetOnSuccess) form.reset();
    });
  }

  return (
    <PendingCtx.Provider value={pending}>
      <form onSubmit={onSubmit} className={className}>
        {children}
        {state?.message && (
          <div className={`alert ${state.ok ? 'alert-ok' : 'alert-err'}`} role="status" style={{ marginTop: 12 }}>
            {state.message}
          </div>
        )}
      </form>
    </PendingCtx.Provider>
  );
}
