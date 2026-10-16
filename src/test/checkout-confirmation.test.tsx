import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/CustomerOrders", () => ({
  OrderInvoice: ({ id }: { id: string }) => <div data-testid="verified-order-id">{id}</div>,
}));

import { CheckoutConfirmationPage } from "@/routes/checkout_.confirm";

afterEach(() => cleanup());

describe("checkout confirmation route contract", () => {
  it("never claims success without a validated server order reference", () => {
    render(<CheckoutConfirmationPage />);

    expect(screen.getByRole("heading", { name: "تأكيد الطلب" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("لن نعرض نجاحًا دون سجل");
    expect(screen.getByRole("link", { name: "فتح طلباتي" }).getAttribute("href")).toBe("/orders");
    expect(screen.queryByTestId("verified-order-id")).toBeNull();
  });

  it("opens the existing server-backed order details only for a valid UUID", () => {
    const orderId = "11111111-1111-4111-8111-111111111111";
    render(<CheckoutConfirmationPage orderId={orderId} />);

    expect(screen.getByTestId("verified-order-id").textContent).toBe(orderId);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects malformed order references instead of treating them as confirmations", () => {
    render(<CheckoutConfirmationPage orderId="not-an-order" />);

    expect(screen.getByRole("alert").textContent).toContain("لن نعرض نجاحًا دون سجل");
    expect(screen.queryByTestId("verified-order-id")).toBeNull();
  });
});
