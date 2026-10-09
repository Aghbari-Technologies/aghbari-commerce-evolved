export type InvoiceAmount = { id: string; total_amount: number | string; status?: string };
export type PaymentAmount = { invoice_id: string; amount: number | string };

function money(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeAccount(invoices: InvoiceAmount[], payments: PaymentAmount[]) {
  const paidByInvoice = new Map<string, number>();
  for (const payment of payments) {
    paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + money(payment.amount));
  }
  const activeInvoices = invoices.filter((invoice) => invoice.status !== 'void');
  const activeIds = new Set(activeInvoices.map((invoice) => invoice.id));
  const invoiced = activeInvoices.reduce((sum, invoice) => sum + money(invoice.total_amount), 0);
  const paid = payments
    .filter((payment) => activeIds.has(payment.invoice_id))
    .reduce((sum, payment) => sum + money(payment.amount), 0);
  const outstanding = activeInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, money(invoice.total_amount) - (paidByInvoice.get(invoice.id) ?? 0)),
    0,
  );
  return { invoiced, paid, outstanding };
}

export type CartLineDraft = { product_id: string; quantity: number };
export function normalizeCartDraft(value: unknown): CartLineDraft[] {
  if (!Array.isArray(value)) return [];
  const lines: CartLineDraft[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const productId = (row as Record<string, unknown>).product_id;
    const quantity = (row as Record<string, unknown>).quantity;
    if (typeof productId !== 'string' || !productId.trim() || seen.has(productId)) continue;
    const n = typeof quantity === 'number' ? quantity : Number(quantity);
    if (!Number.isSafeInteger(n) || n < 1 || n > 10000) continue;
    seen.add(productId);
    lines.push({ product_id: productId, quantity: n });
  }
  return lines;
}

export type QuickOrderLineInput = {
  product_id: string;
  product_name: string;
  quantity: number;
  available: number;
  already_in_cart?: number;
};
export type QuickOrderValidation =
  | { valid: true }
  | { valid: false; reason: 'empty' | 'invalid_quantity' | 'insufficient_stock'; product_name?: string };

export function validateQuickOrderLines(lines: QuickOrderLineInput[]): QuickOrderValidation {
  if (lines.length === 0) return { valid: false, reason: 'empty' };
  for (const line of lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      return { valid: false, reason: 'invalid_quantity', product_name: line.product_name };
    }
    if (!Number.isSafeInteger(line.available) || line.available < 0 ||
        !Number.isSafeInteger(line.already_in_cart ?? 0) || (line.already_in_cart ?? 0) < 0 ||
        line.available < (line.already_in_cart ?? 0) + line.quantity) {
      return { valid: false, reason: 'insufficient_stock', product_name: line.product_name };
    }
  }
  return { valid: true };
}

export type CustomerOrderStatusSnapshot = { order_number: string | number; status: string; created_at: string };
export type CustomerInvoiceStatusSnapshot = { invoice_number: string; status: string; issued_at: string };

const CUSTOMER_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending: 'بانتظار المراجعة',
  confirmed: 'مؤكد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  needs_customer_amendment: 'بانتظار تعديل العميل',
  returned_for_adjustment: 'أُعيد للتعديل',
  awaiting_customer_payment: 'بانتظار السداد',
};

const CUSTOMER_INVOICE_STATUS_LABELS: Record<string, string> = {
  issued: 'صادرة',
  unpaid: 'مستحقة',
  unpaid: 'مستحقة',
  partially_paid: 'مدفوعة جزئيًا',
  paid: 'مدفوعة',
  void: 'ملغاة',
  overdue: 'متأخرة',
};

type DateFormatter = (value: string) => string;

/** Customer assistant status summaries intentionally omit every monetary field. */
export function summarizeCustomerOrderStatuses(
  rows: CustomerOrderStatusSnapshot[],
  formatDate: DateFormatter,
): string {
  if (!rows.length) return 'لم يُعثر على طلبات مسجلة لحسابك.';
  return 'أحدث طلبات حسابك:\n' + rows.slice(0, 10).map((row) =>
    String(row.order_number) + ' — ' + (CUSTOMER_ORDER_STATUS_LABELS[row.status] ?? row.status) +
    ' — ' + formatDate(row.created_at),
  ).join('\n') + (rows.length > 10 ? '\nوتوجد ' + (rows.length - 10) + ' طلبات أقدم.' : '');
}

/** Invoice numbers and states are safe to summarize; amounts belong only on the statement surface. */
export function summarizeCustomerInvoiceStatuses(
  rows: CustomerInvoiceStatusSnapshot[],
  formatDate: DateFormatter,
): string {
  const statementNote = 'للاطلاع على الأرصدة والمدفوعات، افتح شاشة كشف الحساب.';
  if (!rows.length) return 'لا توجد فواتير مسجلة لحسابك. ' + statementNote;
  return 'الفواتير المسجلة لحسابك:\n' + rows.slice(0, 10).map((row) =>
    row.invoice_number + ' — ' + (CUSTOMER_INVOICE_STATUS_LABELS[row.status] ?? row.status) +
    ' — ' + formatDate(row.issued_at),
  ).join('\n') + (rows.length > 10 ? '\nوتوجد ' + (rows.length - 10) + ' فواتير أقدم.' : '') +
    '\n' + statementNote;
}

export type AssistantIntent = 'order_status' | 'catalog_search' | 'invoice_help' | 'offline_help' | 'general';
export function classifyAssistantIntent(question: string): AssistantIntent {
  const q = question.trim().toLocaleLowerCase('ar');
  if (/فاتور|كشف حساب|رصيد|سداد|مستحق/.test(q)) return 'invoice_help';
  if (/انترنت|إنترنت|دون اتصال|بدون اتصال|أوفلاين|offline/.test(q)) return 'offline_help';
  if (/طلب|شحن|توصيل|حالة الطلب|تتبع/.test(q)) return 'order_status';
  if (/منتج|صنف|سعر|باركود|مخزون|متوفر|ابحث|بحث/.test(q)) return 'catalog_search';
  return 'general';
}
