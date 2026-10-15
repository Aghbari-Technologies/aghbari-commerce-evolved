import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: rpcMock },
  getCurrentTenantScope: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "auth-user-accountant",
      profileId: "profile-accountant",
      email: "accountant@example.test",
      name: "محاسب اختبار",
      roles: ["accountant"],
      isStaff: true,
    },
    ready: true,
    loading: false,
  }),
}));

import { StaffFinancePage } from "./CustomerWorkflows";

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const FINANCE_DATA = {
  invoices: [
    {
      id: INVOICE_ID,
      invoice_number: "INV-2026-001",
      order_id: "22222222-2222-4222-8222-222222222222",
      customer_id: "33333333-3333-4333-8333-333333333333",
      status: "partially_paid",
      issued_at: "2026-10-15T09:00:00.000Z",
      due_at: "2026-10-30T00:00:00.000Z",
      currency: "YER",
      subtotal: "100.00",
      tax_amount: "0.00",
      total_amount: "100.00",
    },
  ],
  payments: [
    {
      invoice_id: INVOICE_ID,
      amount: "25.00",
      paid_at: "2026-10-15T09:30:00.000Z",
      payment_method: "cash",
    },
  ],
};

describe("StaffFinancePage payment amount guard", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "fetch_staff_finance_data") {
        return { data: FINANCE_DATA, error: null };
      }
      if (name === "record_customer_payment") {
        return { data: { success: true }, error: null };
      }
      return { data: null, error: { message: "Unexpected RPC in test" } };
    });
  });

  it("does not call the payment RPC when a payment exceeds the remaining balance", async () => {
    render(<StaffFinancePage />);

    await screen.findByRole("option", { name: /INV-2026-001/ });
    fireEvent.change(screen.getByLabelText("الفاتورة"), {
      target: { value: INVOICE_ID },
    });
    fireEvent.change(screen.getByLabelText("المبلغ"), {
      target: { value: "75.01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تسجيل الدفعة" }));

    expect(
      await screen.findByText("المبلغ يتجاوز المتبقي على الفاتورة."),
    ).toBeInTheDocument();
    expect(rpcMock).not.toHaveBeenCalledWith(
      "record_customer_payment",
      expect.anything(),
    );
  });

  it("submits an amount equal to the remaining balance", async () => {
    render(<StaffFinancePage />);

    await screen.findByRole("option", { name: /INV-2026-001/ });
    fireEvent.change(screen.getByLabelText("الفاتورة"), {
      target: { value: INVOICE_ID },
    });
    fireEvent.change(screen.getByLabelText("المبلغ"), {
      target: { value: "75.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تسجيل الدفعة" }));

    expect(
      await screen.findByText("تم تسجيل الدفعة وتحديث حالة الفاتورة."),
    ).toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledWith("record_customer_payment", {
      p_invoice_id: INVOICE_ID,
      p_amount: 75,
      p_payment_method: "cash",
      p_reference: null,
      p_notes: null,
    });
  });
});
