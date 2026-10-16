import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  loading: false,
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => authMock }));

import { Login } from "@/components/Login";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  authMock.loading = false;
  authMock.signIn.mockResolvedValue(undefined);
  authMock.signUp.mockResolvedValue({ needsConfirmation: true });
  authMock.resetPassword.mockResolvedValue(undefined);
});

function fillEmail(email: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "البريد الإلكتروني" }), {
    target: { value: email },
  });
}

function submitForm() {
  const form = screen.getByRole("button", { name: "إرسال الرابط" }).closest("form");
  if (!form) throw new Error("Authentication form is missing");
  fireEvent.submit(form);
}

describe("direct authentication entry routes", () => {
  it("opens the password-recovery form without exposing a password field", () => {
    render(<Login initialMode="forgot" />);

    expect(screen.getByRole("heading", { name: "استعادة كلمة المرور" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "إرسال الرابط" })).toBeTruthy();
    expect(screen.queryByLabelText("كلمة المرور")).toBeNull();
  });

  it("validates email before requesting a password-reset link", async () => {
    render(<Login initialMode="forgot" />);
    fillEmail("not-an-email");
    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("أدخل بريداً إلكترونياً صحيحاً");
    expect(authMock.resetPassword).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows success only after the reset-link request resolves", async () => {
    render(<Login initialMode="forgot" />);
    fillEmail("buyer@example.com");
    submitForm();

    await waitFor(() => expect(authMock.resetPassword).toHaveBeenCalledWith("buyer@example.com"));
    expect(await screen.findByRole("status")).toHaveTextContent("أرسلنا رابط إعادة تعيين كلمة المرور");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the backend failure and never reports a false success", async () => {
    authMock.resetPassword.mockRejectedValueOnce(new Error("تعذر إرسال رابط الاستعادة"));
    render(<Login initialMode="forgot" />);
    fillEmail("buyer@example.com");
    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر إرسال رابط الاستعادة");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("opens registration directly with the required name and password fields", () => {
    render(<Login initialMode="register" />);

    expect(screen.getByRole("heading", { name: "إنشاء حساب تجاري" })).toBeTruthy();
    expect(screen.getByLabelText("الاسم الكامل")).toBeTruthy();
    expect(screen.getByLabelText("كلمة المرور")).toBeTruthy();
    expect(screen.getByRole("button", { name: "إنشاء الحساب" })).toBeTruthy();
  });
});
