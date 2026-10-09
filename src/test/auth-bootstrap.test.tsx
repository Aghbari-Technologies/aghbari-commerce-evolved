import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy({}, {
    get(_target, property) {
      if (property === 'auth') {
        throw new Error('Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Connect Supabase in Lovable Cloud.');
      }
      return undefined;
    },
  }),
}));

import { AuthProvider, useAuth } from '@/lib/auth';

function AuthBootstrapProbe() {
  const { ready, configurationError } = useAuth();
  return (
    <div>
      <span>{ready ? 'auth-ready' : 'auth-loading'}</span>
      {configurationError && <div role="alert">{configurationError}</div>}
    </div>
  );
}

describe('Auth bootstrap resilience', () => {
  it('keeps the app mounted and gives an actionable message when Supabase configuration is missing', async () => {
    render(
      <AuthProvider>
        <AuthBootstrapProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('auth-ready')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('اربط Supabase من إعدادات Lovable Cloud');
      expect(screen.getByRole('alert')).toHaveTextContent('SUPABASE_URL');
    });
  });
});
