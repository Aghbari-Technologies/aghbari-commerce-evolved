import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser: mocks.updateUser } },
}));

import { ResetPasswordPage } from "@/routes/reset-password";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateUser.mockResolvedValue({ error: null });
});

function fillPasswords(password: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور الجديدة"), { target: { value: confirmation } });
}

function submitForm() {
  const form = screen.getByRole("button", { name: "حفظ" }).closest("form");
  if (!form) throw new Error("Reset-password form is missing");
  fireEvent.submit(form);
}

describe("password reset form", () => {
  it("rejects short passwords without making an auth request", async () => {
    render(<ResetPasswordPage />);
    fillPasswords("short", "short");
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("8 أحرف على الأقل");
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation without making an auth request", async () => {
    render(<ResetPasswordPage />);
    fillPasswords("CorrectPass123", "DifferentPass123");
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("تأكيد كلمة المرور غير مطابق");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("navigates only after Supabase confirms the password update", async () => {
    render(<ResetPasswordPage />);
    fillPasswords("CorrectPass123", "CorrectPass123");
    submitForm();
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "CorrectPass123" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a backend error and never reports success", async () => {
    mocks.updateUser.mockResolvedValueOnce({ error: { message: "rejected by auth" } });
    render(<ResetPasswordPage />);
    fillPasswords("CorrectPass123", "CorrectPass123");
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("انتهت صلاحية الرابط");
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "حفظ" })).toBeEnabled();
  });

  it("recovers from a rejected network promise and re-enables retry", async () => {
    mocks.updateUser.mockRejectedValueOnce(new Error("network down"));
    render(<ResetPasswordPage />);
    fillPasswords("CorrectPass123", "CorrectPass123");
    submitForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("مشكلة في الاتصال");
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "حفظ" })).toBeEnabled();
  });
});
