import { describe, expect, it } from "vitest";
import { parseCustomerCheckoutPreview, parseCustomerOrderFinancials } from "@/lib/customer-money-policy";

const hiddenCheckout = {
  valid: true, pricing_verified: true, item_count: 1, currency: "YER", amounts_visible: false,
  items: [{ product_id: "p1", name: "Rice", item_code: "SKU-1", unit: "carton", quantity: 2 }],
};

describe("server-authorized customer financial display", () => {
  it("accepts checkout validation without exposing money by default", () => {
    const parsed = parseCustomerCheckoutPreview(hiddenCheckout);
    expect(parsed.amounts_visible).toBe(false);
    expect(parsed.items[0]).not.toHaveProperty("unit_price");
    expect(parsed).not.toHaveProperty("total_amount");
  });
  it("rejects monetary values when the server marks the cart as hidden", () => {
    expect(() => parseCustomerCheckoutPreview({ ...hiddenCheckout, items: [{ ...hiddenCheckout.items[0], unit_price: 5 }] })).toThrow(/حقولًا مالية غير مسموحة/);
    expect(() => parseCustomerCheckoutPreview({ ...hiddenCheckout, total_amount: 10 })).toThrow(/بيانات مالية غير مسموحة/);
  });
  it("accepts complete server-resolved values when the manager-enabled policy is true", () => {
    const parsed = parseCustomerCheckoutPreview({
      ...hiddenCheckout, amounts_visible: true, total_amount: 12,
      items: [{ ...hiddenCheckout.items[0], unit_price: 6, line_total: 12 }],
    });
    expect(parsed.amounts_visible).toBe(true);
    expect(parsed.items[0].unit_price).toBe(6);
    expect(parsed.total_amount).toBe(12);
  });
  it("rejects incomplete opt-in responses and inconsistent totals", () => {
    expect(() => parseCustomerCheckoutPreview({
      ...hiddenCheckout, amounts_visible: true, total_amount: 12,
      items: [{ ...hiddenCheckout.items[0], unit_price: 6 }],
    })).toThrow(/إجمالي الصنف/);
    expect(() => parseCustomerCheckoutPreview({
      ...hiddenCheckout, amounts_visible: true, total_amount: 13,
      items: [{ ...hiddenCheckout.items[0], unit_price: 6, line_total: 12 }],
    })).toThrow(/لا يطابق مجموع تفاصيلها/);
  });
  it("accepts null order amounts only in the hidden path", () => {
    const parsed = parseCustomerOrderFinancials({
      amounts_visible: false, currency: "YER", total_amount: null,
      items: [{ id: "line-1", unit_price: null, line_total: null }],
    });
    expect(parsed.amounts_visible).toBe(false);
    expect(parsed.items[0].unit_price).toBeNull();
    expect(() => parseCustomerOrderFinancials({
      amounts_visible: false, currency: "YER", total_amount: 10,
      items: [{ id: "line-1", unit_price: null, line_total: null }],
    })).toThrow(/الإجمالي فارغًا/);
  });
  it("accepts complete order amounts only when visibility is server-authorized", () => {
    const parsed = parseCustomerOrderFinancials({
      amounts_visible: true, currency: "YER", total_amount: 12,
      items: [{ id: "line-1", unit_price: 6, line_total: 12 }],
    });
    expect(parsed.total_amount).toBe(12);
    expect(parsed.items[0].line_total).toBe(12);
  });
});
