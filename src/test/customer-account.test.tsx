import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: "auth-user", profileId: "profile-1", email: "buyer@example.test", name: "مشتري تجريبي", roles: ["customer"], isStaff: false } as { id: string; profileId: string; email: string; name: string; roles: string[]; isStaff: boolean } | null,
    ready: true,
    configurationError: null as string | null,
    signOut: vi.fn(),
  },
  fetchWorkspace: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: import("react").ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/customer-company-members", () => ({ fetchCompanyMembershipWorkspace: mocks.fetchWorkspace }));

import { AccountApprovalStatusPage, CompanyDetailsPage, CustomerProfilePage } from "@/components/CustomerAccount";

afterEach(() => cleanup());
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.user = { id: "auth-user", profileId: "profile-1", email: "buyer@example.test", name: "مشتري تجريبي", roles: ["customer"], isStaff: false };
  mocks.auth.ready = true;
  mocks.auth.configurationError = null;
  mocks.auth.signOut.mockResolvedValue(undefined);
  mocks.fetchWorkspace.mockResolvedValue({
    company_name: "شركة الاختبار",
    members: [{ profile_id: "member-1" }],
    invitations: [{ invitation_id: "invite-1" }, { invitation_id: "invite-2" }],
  });
});

describe("customer account and company views", () => {
  it("renders the authenticated identity and only reports logout navigation after sign-out resolves", async () => {
    render(<CustomerProfilePage />);
    expect(screen.getByRole("heading", { name: "ملفي الشخصي" })).toBeTruthy();
    expect(screen.getByText("مشتري تجريبي")).toBeTruthy();
    expect(screen.getByText("buyer@example.test")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "تسجيل الخروج" }));
    await waitFor(() => expect(mocks.auth.signOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true }));
  });

  it("does not navigate away or claim success when logout fails", async () => {
    mocks.auth.signOut.mockRejectedValueOnce(new Error("انتهت مهلة الاتصال"));
    render(<CustomerProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: "تسجيل الخروج" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("انتهت مهلة الاتصال");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("reads company data from the company-membership backend and exposes a retry after failure", async () => {
    mocks.fetchWorkspace.mockRejectedValueOnce(new Error("الخادم غير متاح"));
    render(<CompanyDetailsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("الخادم غير متاح");
    mocks.fetchWorkspace.mockResolvedValueOnce({ company_name: "شركة مؤكدة", members: [], invitations: [] });
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByRole("heading", { name: "شركة مؤكدة" })).toBeTruthy();
    expect(mocks.fetchWorkspace).toHaveBeenCalledTimes(2);
  });

  it("never labels approval state as pending when the backend does not expose it", () => {
    render(<AccountApprovalStatusPage />);
    expect(screen.getByRole("heading", { name: "حالة اعتماد الحساب" })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("لا توفر خدمة الحساب الحالية حالة اعتماد إدارية موثقة");
  });
});
