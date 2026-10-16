import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { auth: authMock } }));

import { VerifyPage } from "@/routes/verify";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/verify");
  authMock.getSession.mockResolvedValue({ data: { session: { user: { id: "confirmed-user" } } }, error: null });
  authMock.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

describe("email verification callback route", () => {
  it("does not claim verification when the page is opened without a callback", async () => {
    render(<VerifyPage />);

    expect(await screen.findByRole("heading", { name: "تأكيد البريد الإلكتروني" })).toBeTruthy();
    expect(screen.getByText(/افتح رابط التأكيد/)).toBeTruthy();
    expect(authMock.getSession).not.toHaveBeenCalled();
  });

  it("confirms a PKCE callback only after a session is available", async () => {
    window.history.replaceState({}, "", "/verify?code=valid-confirmation-code");
    render(<VerifyPage />);

    expect(await screen.findByRole("heading", { name: "تم تأكيد البريد الإلكتروني" })).toBeTruthy();
    expect(authMock.getSession).toHaveBeenCalledTimes(1);
  });

  it("recognizes a verified signup token returned in the URL fragment", async () => {
    window.history.replaceState({}, "", "/verify#access_token=test&refresh_token=test&type=signup");
    render(<VerifyPage />);

    expect(await screen.findByRole("heading", { name: "تم تأكيد البريد الإلكتروني" })).toBeTruthy();
  });

  it("fails closed when the callback cannot establish a session", async () => {
    window.history.replaceState({}, "", "/verify?code=expired-code");
    authMock.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<VerifyPage />);

    expect(await screen.findByRole("heading", { name: "تعذر تأكيد البريد الإلكتروني" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("غير صالح أو انتهت صلاحيته");
  });

  it("shows an auth callback error without claiming successful verification", async () => {
    window.history.replaceState({}, "", "/verify?error=access_denied&error_description=expired");
    render(<VerifyPage />);

    expect(await screen.findByRole("heading", { name: "تعذر تأكيد البريد الإلكتروني" })).toBeTruthy();
    expect(authMock.getSession).not.toHaveBeenCalled();
  });
});
