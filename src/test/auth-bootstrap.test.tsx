import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
      root = undefined;
    }
    host?.remove();
    host = undefined;
  });

  it('keeps the root mounted and reports an actionable Supabase configuration issue', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(<AuthProvider><AuthBootstrapProbe /></AuthProvider>);
    });

    expect(host.textContent).toContain('auth-ready');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('اربط Supabase من إعدادات Lovable Cloud');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('SUPABASE_URL');
  });
});
