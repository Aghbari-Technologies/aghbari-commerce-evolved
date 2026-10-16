import { act } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { auth: authMock } }));

import { AuthProvider, useAuth } from "@/lib/auth";

function AuthFlowProbe() {
  const { signUp, resetPassword, loading } = useAuth();
  return (
    <div>
      <button type="button" onClick={() => void signUp("buyer@example.com", "Password123!", "Buyer Account")}>signup</button>
      <button type="button" onClick={() => void resetPassword("buyer@example.com")}>reset</button>
      <output data-testid="auth-loading">{loading ? "busy" : "idle"}</output>
    </div>
  );
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/register");
  authMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
  authMock.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  authMock.signUp.mockResolvedValue({ data: { session: null }, error: null });
  authMock.resetPasswordForEmail.mockResolvedValue({ error: null });
});

describe("auth recovery and verification redirect contract", () => {
  it("sends new non-invitation email confirmations to the verification route", async () => {
    render(<AuthProvider><AuthFlowProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "signup" }));

    await waitFor(() => expect(authMock.signUp).toHaveBeenCalledTimes(1));
    const options = authMock.signUp.mock.calls[0][0].options;
    expect(options.emailRedirectTo).toBe(`${window.location.origin}/verify`);
    expect(await screen.findByTestId("auth-loading")).toHaveTextContent("idle");
  });

  it("preserves the verified invitation-token redirect", async () => {
    window.history.replaceState({}, "", "/company/accept-invitation?token=invite-token");
    render(<AuthProvider><AuthFlowProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "signup" }));

    await waitFor(() => expect(authMock.signUp).toHaveBeenCalledTimes(1));
    const options = authMock.signUp.mock.calls[0][0].options;
    expect(options.emailRedirectTo).toBe(`${window.location.origin}/company/accept-invitation?token=invite-token`);
  });

  it("marks password recovery as busy and clears loading after the provider responds", async () => {
    let finish!: (value: { error: null }) => void;
    authMock.resetPasswordForEmail.mockImplementation(() => new Promise(resolve => {
      finish = resolve;
    }));
    render(<AuthProvider><AuthFlowProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "reset" }));

    await waitFor(() => expect(authMock.resetPasswordForEmail).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("auth-loading")).toHaveTextContent("busy");
    await act(async () => { finish({ error: null }); });
    await waitFor(() => expect(screen.getByTestId("auth-loading")).toHaveTextContent("idle"));
  });
});
