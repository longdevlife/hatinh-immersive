import { useEffect, useState, type ReactNode } from 'react';

import type { AdminLogin200User, GetAdminSession200User } from '@hatinh/api-client';

import { adminLogin, getAdminSession } from '../../../shared/api/catalog';
import { AdminLoginForm } from './AdminLoginForm';

type AuthState =
  | { status: 'checking' }
  | { status: 'signed-out'; error?: string }
  | { status: 'signed-in'; user: AdminLogin200User | GetAdminSession200User };

type AdminAuthGateProps = {
  children: ReactNode;
};

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [state, setState] = useState<AuthState>({ status: 'checking' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void getAdminSession().then((response) => {
      if (!active) return;
      setState(
        response.status === 200 && response.data.user
          ? { status: 'signed-in', user: response.data.user }
          : { status: 'signed-out' },
      );
    });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'checking') {
    return (
      <main className="auth-gate" aria-live="polite">
        <p>Checking your session…</p>
      </main>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <main className="auth-gate">
        <AdminLoginForm
          {...(state.error ? { error: state.error } : {})}
          isSubmitting={isSubmitting}
          onSubmit={(values) => {
            setIsSubmitting(true);
            void adminLogin(values)
              .then((response) => {
                if (response.status !== 200 || !response.data.user) {
                  setState({ status: 'signed-out', error: 'Email or password is not correct.' });
                  return;
                }
                setState({ status: 'signed-in', user: response.data.user });
              })
              .catch(() => setState({ status: 'signed-out', error: 'Could not sign in.' }))
              .finally(() => setIsSubmitting(false));
          }}
        />
      </main>
    );
  }

  return <>{children}</>;
}
