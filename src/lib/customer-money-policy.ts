type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("استجابة سياسة المبالغ غير صالحة.");
  return value as UnknownRecord;
}
function parseMoney(value: unknown, label: string): number {
  const amount = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0) throw new Error("قيمة مالية غير صالحة: " + label + ".");
  return amount;
}
function parseCurrency(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value)) throw new Error("رمز العملة في استجابة الخادم غير صالح.");
  return value;
}
function parseQuantity(value: unknown): number {
  const quantity = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("الكمية في استجابة التحقق غير صالحة.");
  return quantity;
}

export type CustomerCheckoutPreviewLine = {
  product_id: string;
  name: string;
  item_code: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  line_total?: number;
};
export type CustomerCheckoutPreview = {
  valid: true;
  items: CustomerCheckoutPreviewLine[];
  item_count: number;
  currency: string;
  pricing_verified: true;
  amounts_visible: boolean;
  total_amount?: number;
};

export function parseCustomerCheckoutPreview(payload: unknown): CustomerCheckoutPreview {
  const source = asRecord(payload);
  if (source.valid !== true || source.pricing_verified !== true || !Array.isArray(source.items)) throw new Error("لم يقدم الخادم تحققًا صالحًا من سلة الطلب.");
  const itemCount = Number(source.item_count);
  if (!Number.isSafeInteger(itemCount) || itemCount !== source.items.length || itemCount < 1) throw new Error("عدد أصناف السلة في استجابة الخادم غير متطابق.");
  const currency = parseCurrency(source.currency);
  if (typeof source.amounts_visible !== "boolean") throw new Error("لم يحدد الخادم سياسة عرض المبالغ صراحة.");

  const items = source.items.map((entry, index): CustomerCheckoutPreviewLine => {
    const row = asRecord(entry);
    if (typeof row.product_id !== "string" || !row.product_id || typeof row.name !== "string" || typeof row.item_code !== "string" || typeof row.unit !== "string") {
      throw new Error("بيانات الصنف رقم " + (index + 1) + " غير مكتملة.");
    }
    const quantity = parseQuantity(row.quantity);
    if (source.amounts_visible) {
      return {
        product_id: row.product_id, name: row.name, item_code: row.item_code, unit: row.unit, quantity,
        unit_price: parseMoney(row.unit_price, "سعر الوحدة"), line_total: parseMoney(row.line_total, "إجمالي الصنف"),
      };
    }
    if ("unit_price" in row || "line_total" in row || "total_amount" in row) throw new Error("رفض عرض استجابة مخفية تحتوي حقولًا مالية.");
    return { product_id: row.product_id, name: row.name, item_code: row.item_code, unit: row.unit, quantity };
  });

  if (!source.amounts_visible) {
    if ("total_amount" in source || items.length === 0) throw new Error("استجابة السياسة المخفية تحتوي بيانات مالية غير مسموحة.");
    return { valid: true, items, item_count: itemCount, currency, pricing_verified: true, amounts_visible: false };
  }
  const totalAmount = parseMoney(source.total_amount, "إجمالي الطلب");
  const itemTotal = items.reduce((sum, item) => sum + (item.line_total ?? 0), 0);
  if (Math.abs(itemTotal - totalAmount) > 0.02) throw new Error("إجمالي السلة لا يطابق مجموع تفاصيلها؛ أُخفيت المبالغ.");
  return { valid: true, items, item_count: itemCount, currency, pricing_verified: true, amounts_visible: true, total_amount: totalAmount };
}

export type CustomerOrderFinancialItem = { id: string; unit_price: number | null; line_total: number | null };
export type CustomerOrderFinancials = { amounts_visible: boolean; currency: string; total_amount: number | null; items: CustomerOrderFinancialItem[] };

export function parseCustomerOrderFinancials(payload: unknown): CustomerOrderFinancials {
  const source = asRecord(payload);
  if (typeof source.amounts_visible !== "boolean" || !Array.isArray(source.items)) throw new Error("استجابة سياسة مبالغ الطلب غير مكتملة.");
  const currency = parseCurrency(source.currency);
  const items = source.items.map((entry, index): CustomerOrderFinancialItem => {
    const row = asRecord(entry);
    if (typeof row.id !== "string" || !row.id) throw new Error("هوية بند الطلب رقم " + (index + 1) + " غير صالحة.");
    if (!source.amounts_visible) {
      if (row.unit_price !== null || row.line_total !== null) throw new Error("رفض استجابة طلب مخفية تتضمن مبالغ.");
      return { id: row.id, unit_price: null, line_total: null };
    }
    return { id: row.id, unit_price: parseMoney(row.unit_price, "سعر بند الطلب"), line_total: parseMoney(row.line_total, "إجمالي بند الطلب") };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error("تكررت هوية بند في استجابة مالية الطلب.");
  const totalAmount = source.amounts_visible
    ? parseMoney(source.total_amount, "إجمالي الطلب")
    : source.total_amount === null ? null : (() => { throw new Error("استجابة الطلب المخفية يجب أن تعيد الإجمالي فارغًا."); })();
  return { amounts_visible: source.amounts_visible, currency, total_amount: totalAmount, items };
}
