import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { name: "مشرف الاختبار", email: "admin@example.test", isStaff: true },
    ready: true,
    signOut: mocks.signOut,
  }),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/components/Login", () => ({ Login: () => <div>تسجيل الدخول</div> }));
vi.mock("@/components/OperationsCenter", () => ({ OperationsCenter: () => null }));
vi.mock("@/components/CustomerWorkflows", () => ({
  StaffQuotesPage: () => null,
  StaffFinancePage: () => null,
}));
vi.mock("@/components/AdminPages", () => {
  const EmptyComponent = () => null;
  return {
    AiCenter: EmptyComponent,
    Devices: EmptyComponent,
    Field: EmptyComponent,
    Loading: EmptyComponent,
    ErrorBox: EmptyComponent,
    Empty: EmptyComponent,
    Button: EmptyComponent,
    TableWrap: EmptyComponent,
    Modal: EmptyComponent,
    Notifications: EmptyComponent,
    OrderDetail: EmptyComponent,
    SettingsPage: () => <div data-testid="admin-settings">الإعدادات</div>,
    Suppliers: EmptyComponent,
  };
});

import { AdminApp } from "@/components/AghbariApp";

describe("admin command palette", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.signOut.mockReset();
  });

  it("opens from the quick-search button and navigates to a selected admin section", async () => {
    render(<AdminApp initialView="settings" />);

    fireEvent.click(screen.getByRole("button", { name: "بحث سريع (Ctrl K)" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const input = screen.getByPlaceholderText("ابحث عن قسم أو صفحة أو إجراء...");
    fireEvent.change(input, { target: { value: "الطلبات" } });
    fireEvent.click(await screen.findByRole("option", { name: /الطلبات/ }));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin/orders" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens with Ctrl+K", async () => {
    render(<AdminApp initialView="settings" />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
