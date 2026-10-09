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
  const invoiced = invoices.reduce((sum, invoice) => sum + money(invoice.total_amount), 0);
  const paid = payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const outstanding = invoices.reduce(
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

export type AssistantIntent = 'order_status' | 'catalog_search' | 'invoice_help' | 'offline_help' | 'general';
export function classifyAssistantIntent(question: string): AssistantIntent {
  const q = question.trim().toLocaleLowerCase('ar');
  if (/فاتور|كشف حساب|رصيد|سداد|مستحق/.test(q)) return 'invoice_help';
  if (/انترنت|إنترنت|دون اتصال|بدون اتصال|أوفلاين|offline/.test(q)) return 'offline_help';
  if (/طلب|شحن|توصيل|حالة الطلب|تتبع/.test(q)) return 'order_status';
  if (/منتج|صنف|سعر|باركود|مخزون|متوفر|ابحث|بحث/.test(q)) return 'catalog_search';
  return 'general';
}
