import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  ScanLine,
  Send,
  CheckCircle2,
  Bot,
  Banknote,
  Wifi,
  WifiOff,
  MapPin,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Login } from "@/components/Login";
import { useAuth } from "@/lib/auth";
import { getCurrentTenantScope, supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, formatDateShort, formatNumber } from "@/lib/format";
import {
  classifyAssistantIntent,
  matchesArabicCatalogSearch,
  normalizeCartDraft,
  sanitizePublicCatalogCache,
  summarizeCustomerInvoiceStatuses,
  summarizeCustomerOrderStatuses,
  type PaymentAmount,
} from "@/lib/commerce-utils";
import { fetchProducts, fetchResolvedProductPrices } from "@/lib/api";
import {
  appendOfflineCartMutation,
  compactOfflineCartLedger,
  createOfflineCartMutationId,
  createOfflineCartScopeKey,
  getOfflineCartLedgerPrefix,
  getOfflineCatalogCacheKey,
  readLegacyCartDraftForScope,
  readOfflineCartLedger,
  writeLegacyCartOwner,
} from "@/lib/offline-cart-ledger";
import { fetchCustomerAddresses, saveCustomerAddress, deleteCustomerAddress, type CustomerAddress, type CustomerAddressInput } from "@/lib/customer-addresses";
import { fetchCustomerCompanyContacts, saveCustomerCompanyContact, deleteCustomerCompanyContact, type CustomerCompanyContact, type CustomerCompanyContactInput } from "@/lib/customer-company-contacts";

type Invoice = {
  id: string;
  invoice_number: string;
  order_id: string;
  customer_id: string;
  status: string;
  issued_at: string;
  due_at: string | null;
  currency: string;
  subtotal?: number | string;
  tax_amount?: number | string;
  total_amount?: number | string;
  paid_amount?: number | string;
  outstanding_amount?: number | string;
};
type AccountStatementCurrencyTotal = {
  currency: string;
  invoiced: number | string;
  paid: number | string;
  outstanding: number | string;
  invoice_count: number;
};
type AccountStatementSummary = {
  invoice_count: number;
  payment_count: number;
  totals_by_currency: AccountStatementCurrencyTotal[];
};
type AccountStatementPayload = {
  invoices: Invoice[];
  payments: (PaymentAmount & { id?: string; paid_at: string })[];
  summary: AccountStatementSummary;
};
function isAccountStatementMoney(value: unknown): value is number | string {
  if (typeof value !== "number" && typeof value !== "string") return false;
  const raw = typeof value === "number" ? String(value) : value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return false;
  return Number.isFinite(Number(raw)) && Number(raw) >= 0;
}
function validateAccountStatementPayload(payload: unknown): AccountStatementPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("استجابة كشف الحساب غير صالحة.");
  }
  const candidate = payload as Partial<AccountStatementPayload>;
  const invoices = candidate.invoices;
  const payments = candidate.payments;
  const summary = candidate.summary;
  if (
    !Array.isArray(invoices) ||
    !Array.isArray(payments) ||
    invoices.length > 200 ||
    payments.length > 500 ||
    !summary ||
    !Number.isSafeInteger(summary.invoice_count) ||
    summary.invoice_count < invoices.length ||
    !Number.isSafeInteger(summary.payment_count) ||
    summary.payment_count < payments.length ||
    !Array.isArray(summary.totals_by_currency)
  ) {
    throw new Error("تعذر التحقق من إجماليات كشف الحساب الكامل. تحقق من تطبيق ترحيل المالية الأخير.");
  }

  const currencies = new Set<string>();
  for (const total of summary.totals_by_currency) {
    if (
      !total ||
      typeof total.currency !== "string" ||
      !/^[A-Za-z]{3}$/.test(total.currency) ||
      !Number.isSafeInteger(total.invoice_count) ||
      total.invoice_count < 0 ||
      !isAccountStatementMoney(total.invoiced) ||
      !isAccountStatementMoney(total.paid) ||
      !isAccountStatementMoney(total.outstanding)
    ) {
      throw new Error("تحتوي إجماليات كشف الحساب على قيمة غير صالحة؛ لم تُعرض كصفر.");
    }
    const currency = total.currency.toUpperCase();
    if (currencies.has(currency)) throw new Error("تكرر رمز العملة في إجماليات كشف الحساب.");
    currencies.add(currency);
  }
  for (const invoice of invoices) {
    if (
      !invoice ||
      typeof invoice.id !== "string" ||
      typeof invoice.invoice_number !== "string" ||
      typeof invoice.status !== "string" ||
      typeof invoice.issued_at !== "string" ||
      typeof invoice.currency !== "string" ||
      !/^[A-Za-z]{3}$/.test(invoice.currency) ||
      !isAccountStatementMoney(invoice.total_amount) ||
      !isAccountStatementMoney(invoice.paid_amount) ||
      !isAccountStatementMoney(invoice.outstanding_amount)
    ) {
      throw new Error("تحتوي تفاصيل إحدى الفواتير على بيانات مالية ناقصة أو غير صالحة.");
    }
  }
  for (const payment of payments) {
    if (
      !payment ||
      typeof payment.invoice_id !== "string" ||
      typeof payment.paid_at !== "string" ||
      !isAccountStatementMoney(payment.amount)
    ) {
      throw new Error("تحتوي تفاصيل الدفعات على بيانات ناقصة أو غير صالحة.");
    }
  }
  return { invoices, payments, summary };
}
type InvoiceLine = {
  id: string;
  item_code: string | null;
  description: string;
  unit: string | null;
  quantity: number | string;
  unit_price?: number | string;
  line_total?: number | string;
};
type InvoiceFinancialSummary = {
  currency: string;
  subtotal: number | string;
  tax_amount: number | string;
  total_amount: number | string;
};

function formatInvoiceMoney(value: number | string | undefined, currency: string): string {
  const amount = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0) return "غير متاح";
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
}
type Product = {
  id: string;
  name: string;
  item_code: string;
  barcode?: string | null;
  unit: string;
  base_price: number | string;
  status?: string;
  image_url?: string | null;
};
type Quote = {
  id: string;
  quote_number: string;
  status: string;
  notes: string | null;
  response_note: string | null;
  created_at: string;
  quoted_at: string | null;
  valid_until: string | null;
};
type QuoteLine = {
  id: string;
  quote_id?: string;
  product_id: string | null;
  item_code: string | null;
  product_name_snapshot: string;
  unit_snapshot: string | null;
  requested_quantity: number | string;
  target_unit_price: number | string | null;
  quoted_unit_price: number | string | null;
};
type ReorderTemplate = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  source_order_id: string | null;
};
type ReorderTemplateLine = { product_id: string | null; quantity: number | string };
type AssistantOrderRow = { order_number: string | number; status: string; created_at: string };
type AssistantInvoiceStatusRow = { invoice_number: string; status: string; issued_at: string };
type AssistantProductRow = {
  id: string;
  name: string;
  item_code: string;
  barcode: string | null;
  unit: string;
  base_price: number | string;
  status: string;
};

const card: React.CSSProperties = {
  background: "var(--card, #fff)",
  border: "1px solid #e0ecee",
  borderRadius: 16,
  padding: 18,
};
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const quiet: React.CSSProperties = { color: "#71868a", fontSize: 13 };
const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #d5e4e5",
  borderRadius: 10,
  background: "#fff",
  color: "#18383c",
};
const primary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: 0,
  borderRadius: 10,
  background: "#087f8d",
  color: "#fff",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};
const secondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "1px solid #d5e4e5",
  borderRadius: 10,
  background: "#fff",
  color: "#087f8d",
  padding: "9px 13px",
  fontWeight: 750,
  cursor: "pointer",
};
const links = [
  ["/addresses", "عناوين التوصيل"],
  ["/company/contacts", "جهات الاتصال بالشركة"],
  ["/company/members", "أعضاء الشركة"],
  ["/invoices", "الفواتير"],
  ["/statement", "كشف الحساب"],
  ["/quotes", "عروض الأسعار"],
  ["/reorder", "إعادة الطلب"],
  ["/barcode", "ماسح الباركود"],
  ["/assistant", "المساعد الذكي"],
  ["/offline", "دون اتصال"],
] as const;

function WorkspaceShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="storefront" dir="rtl" style={{ minHeight: "100vh" }}>
      <header className="sf-header">
        <div className="sf-header-inner">
          <Link to="/" className="sf-brand" style={{ textDecoration: "none" }}>
            <div className="sf-brand-icon">
              <FileText size={22} />
            </div>
            <div>
              <strong>الأغبري</strong>
              <span>الحساب التجاري</span>
            </div>
          </Link>
          <Link to="/" className="sf-admin-btn" style={{ textDecoration: "none" }}>
            <ArrowRight size={16} /> العودة للمتجر
          </Link>
        </div>
      </header>
      <nav
        aria-label="أدوات الحساب"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: 12,
          borderBottom: "1px solid #e3eeee",
          background: "#fff",
        }}
      >
        {links.map(([to, label]) => (
          <Link
            key={to}
            to={to as never}
            style={{
              textDecoration: "none",
              border: "1px solid #d9e8e8",
              borderRadius: 20,
              padding: "6px 12px",
              fontSize: 12,
              color: "#087f8d",
              fontWeight: 800,
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px 64px" }}>
        <h1 style={{ fontSize: 27, margin: "0 0 6px" }}>{title}</h1>
        <p style={{ color: "#71868a", margin: "0 0 22px" }}>{subtitle}</p>
        {children}
      </main>
    </div>
  );
}
function Gate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <WorkspaceShell title="جارٍ التحقق" subtitle="نجهز حسابك التجاري">
        <p role="status">جارٍ تحميل الحساب...</p>
      </WorkspaceShell>
    );
  if (!user) return <Login />;
  return <>{children}</>;
}
function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div
      role="alert"
      style={{ ...card, borderColor: "#efc5c5", color: "#9b2626", marginBottom: 14 }}
    >
      {message}
      {retry && (
        <button style={{ ...secondary, marginInlineStart: 12 }} onClick={retry}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: 28, color: "#71868a" }}>{children}</div>
  );
}

export function CustomerInvoicesPage() {
  return (
    <Gate>
      <Invoices />
    </Gate>
  );
}
function Invoices() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [chosen, setChosen] = useState<Invoice | null>(null);
  const [chosenCustomer, setChosenCustomer] = useState<{
    customer_code: string;
    business_name: string;
    contact_name: string | null;
  } | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<{
    quantity_review_required: boolean;
    customer_adjustment_note: string | null;
    customer_payment_requested_at: string | null;
    payment_request_status: string;
    status: string;
  } | null>(null);
  const [items, setItems] = useState<InvoiceLine[]>([]);
  const [chosenFinancials, setChosenFinancials] = useState<InvoiceFinancialSummary | null>(null);
  const [amountsVisible, setAmountsVisible] = useState(false);
  const [busy, setBusy] = useState(true);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState("");
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    const r = await supabase
      .from("customer_invoices")
      .select("id,invoice_number,order_id,customer_id,status,issued_at,due_at,currency")
      .order("issued_at", { ascending: false })
      .limit(100);
    if (r.error) setError("تعذر تحميل الفواتير. تأكد من نشر ترحيل قاعدة البيانات.");
    else setRows((r.data ?? []) as Invoice[]);
    setBusy(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(i: Invoice) {
    setChosen(i);
    setDetailBusy(true);
    setChosenFinancials(null);
    setAmountsVisible(false);
    setItems([]);
    const [invoicePayloadResult, orderResult] = await Promise.all([
      supabase.rpc("get_customer_invoice_pdf", { p_invoice_id: i.id }),
      supabase
        .from("orders")
        .select(
          "quantity_review_required,customer_adjustment_note,customer_payment_requested_at,payment_request_status,status",
        )
        .eq("id", i.order_id)
        .maybeSingle(),
    ]);
    const payload = invoicePayloadResult.data as {
      invoice?: InvoiceFinancialSummary & { id?: string };
      lines?: InvoiceLine[];
      customer?: {
        customer_code?: string | null;
        business_name?: string | null;
        contact_name?: string | null;
      };
      amounts_visible?: boolean;
    } | null;
    const payloadValid = Boolean(
      payload?.invoice &&
      payload.invoice.id === i.id &&
      Array.isArray(payload.lines) &&
      payload.customer,
    );
    if (invoicePayloadResult.error || orderResult.error || !payloadValid || !payload) {
      setError("تعذر تحميل تفاصيل الفاتورة ومبالغها المصرح بها. تحقق من صلاحية الفاتورة ونشر مخطط المالية.");
      setChosen(null);
      setChosenCustomer(null);
      setChosenFinancials(null);
      setItems([]);
      setInvoiceOrder(null);
    } else {
      setError("");
      setItems(payload.lines ?? []);
      const showAmounts = payload.amounts_visible === true;
      setAmountsVisible(showAmounts);
      setChosenCustomer({
        customer_code: payload.customer?.customer_code ?? "",
        business_name: payload.customer?.business_name ?? "",
        contact_name: payload.customer?.contact_name ?? null,
      });
      setChosenFinancials(showAmounts ? {
        currency: payload.invoice.currency,
        subtotal: payload.invoice.subtotal,
        tax_amount: payload.invoice.tax_amount,
        total_amount: payload.invoice.total_amount,
      } : null);
      setInvoiceOrder(
        orderResult.data as {
          quantity_review_required: boolean;
          customer_adjustment_note: string | null;
          customer_payment_requested_at: string | null;
          payment_request_status: string;
          status: string;
        } | null,
      );
    }
    setDetailBusy(false);
  }
  async function downloadInvoicePdf(invoiceId: string) {
    setPdfBusyId(invoiceId);
    setPdfError("");
    try {
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;
      if (sessionResult.error || !accessToken) {
        throw new Error("سجّل الدخول مجددًا لتنزيل الفاتورة.");
      }

      const response = await fetch(`/api/invoice-pdf/${encodeURIComponent(invoiceId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/pdf",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        let message = "تعذر إنشاء ملف PDF للفاتورة.";
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string" && body.error.length < 240) message = body.error;
        } catch {
          // Preserve the safe fallback for non-JSON responses.
        }
        throw new Error(message);
      }

      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/pdf")) {
        throw new Error("استجابة المستند غير صحيحة؛ لم يتم تنزيل الملف.");
      }
      const blob = await response.blob();
      if (blob.size < 500) throw new Error("ملف PDF فارغ أو غير صالح.");

      const objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "aghbari-invoice.pdf";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : "تعذر تنزيل الفاتورة.");
    } finally {
      setPdfBusyId(null);
    }
  }
  return (
    <WorkspaceShell
      title="فواتيري"
      subtitle="مستندات الفوترة الصادرة بعد اعتماد الإدارة. يظهر السعر والإجمالي فقط إذا فعّلهما المدير في إعدادات الخصوصية."
    >
      <div
        style={{
          ...card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span style={quiet}>{rows.length} فاتورة</span>
        <button style={secondary} onClick={() => void load()}>
          <RefreshCw size={15} /> تحديث
        </button>
      </div>
      {error && <ErrorBox message={error} retry={() => void load()} />}
      {!busy && rows.length >= 100 && (
        <p role="status" style={{ ...quiet, color: "#9b4e22", marginBottom: 12 }}>
          تنبيه اكتمال البيانات: تعرض هذه الصفحة أحدث 100 فاتورة فقط؛ قد توجد فواتير أقدم خارج القائمة.
        </p>
      )}
      <section style={{ ...card, padding: 0, overflowX: "auto" }}>
        {busy ? (
          <p role="status" style={{ padding: 18 }}>
            جارٍ تحميل الفواتير...
          </p>
        ) : !rows.length ? (
          <EmptyBox>
            <FileText size={30} />
            <p>لا توجد فواتير صادرة بعد.</p>
            <p style={quiet}>تُصدر الفاتورة عند تأكيد الطلب من فريق الأغبري.</p>
            <Link to="/orders" className="sf-link">
              عرض طلباتي
            </Link>
          </EmptyBox>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ textAlign: "right", background: "#f4f8f9" }}>
                <th style={{ padding: 12 }}>رقم الفاتورة</th>
                <th>الإصدار</th>
                <th>الاستحقاق</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} style={{ borderTop: "1px solid #edf2f3" }}>
                  <td style={{ padding: 12, fontWeight: 800 }}>{i.invoice_number}</td>
                  <td>{formatDateShort(i.issued_at)}</td>
                  <td>{i.due_at ? formatDateShort(i.due_at) : "حسب الاتفاق"}</td>
                  <td>
                    {i.status === "paid"
                      ? "مدفوعة"
                      : i.status === "partially_paid"
                        ? "مدفوعة جزئيًا"
                        : i.status === "void"
                          ? "ملغاة"
                          : "صادرة"}
                  </td>
                  <td>
                    <button className="sf-link" onClick={() => void open(i)}>
                      عرض / طباعة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {chosen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="تفاصيل الفاتورة"
          className="print-area"
          style={{ ...card, marginTop: 18 }}
        >
          <div
            className="no-print"
            style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
          >
            <button style={secondary} onClick={() => setChosen(null)}>
              إغلاق
            </button>
            <button
              style={primary}
              onClick={() => void downloadInvoicePdf(chosen.id)}
              disabled={pdfBusyId === chosen.id}
            >
              <FileText size={16} />
              {pdfBusyId === chosen.id ? "جارٍ إنشاء PDF..." : "تنزيل PDF عربي"}
            </button>
            <button style={secondary} onClick={() => window.print()}>
              <Printer size={16} /> طباعة من المتصفح
            </button>
          </div>
          {pdfError && <ErrorBox message={pdfError} retry={() => void downloadInvoicePdf(chosen.id)} />}
          <header
            style={{
              borderBottom: "2px solid #087f8d",
              padding: "16px 0",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: "#087f8d" }}>الأغبري</h2>
              <small>فاتورة تجارية</small>
              <div style={{ marginTop: 8 }}>
                رقم العميل: <strong>{chosenCustomer?.customer_code ?? "—"}</strong>
              </div>
              <div>
                اسم العميل:{" "}
                <strong>
                  {chosenCustomer?.business_name ?? chosenCustomer?.contact_name ?? "—"}
                </strong>
              </div>
            </div>
            <div>
              <strong>{chosen.invoice_number}</strong>
              <div>{formatDate(chosen.issued_at)}</div>
              <small>الحالة: {chosen.status}</small>
            </div>
          </header>
          {detailBusy ? (
            <p role="status">جارٍ تحميل البنود...</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ textAlign: "right", padding: 10 }}>الصنف</th>
                  <th>الرمز</th>
                  <th>الكمية</th>
                  {amountsVisible && <><th>سعر الوحدة</th><th>الإجمالي</th></>}
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid #edf2f3" }}>
                    <td style={{ padding: 10 }}>{l.description}</td>
                    <td>{l.item_code ?? "—"}</td>
                    <td>{formatNumber(Number(l.quantity))} {l.unit ?? ""}</td>
                    {amountsVisible && <><td>{formatInvoiceMoney(l.unit_price, chosenFinancials?.currency ?? chosen.currency)}</td><td>{formatInvoiceMoney(l.line_total, chosenFinancials?.currency ?? chosen.currency)}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!amountsVisible && !detailBusy && <p role="status" style={{ ...quiet, marginTop: 12 }}>المبالغ المالية مخفية وفق إعدادات خصوصية الحساب.</p>}
          {!detailBusy && chosenFinancials && (
            <div style={{ ...card, marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <div><span style={quiet}>الإجمالي الفرعي</span><strong style={{ display: "block", marginTop: 6 }}>{formatInvoiceMoney(chosenFinancials.subtotal, chosenFinancials.currency)}</strong></div>
              <div><span style={quiet}>الضريبة</span><strong style={{ display: "block", marginTop: 6 }}>{formatInvoiceMoney(chosenFinancials.tax_amount, chosenFinancials.currency)}</strong></div>
              <div><span style={quiet}>الإجمالي المستحق</span><strong style={{ display: "block", marginTop: 6 }}>{formatInvoiceMoney(chosenFinancials.total_amount, chosenFinancials.currency)}</strong></div>
            </div>
          )}
          {invoiceOrder?.quantity_review_required && (
            <p role="alert" style={{ marginTop: 14, fontWeight: 800, color: "#9a5b13" }}>
              تنبيه: الطلب بانتظار اعتماد تعديلات الكميات أو الأسعار.
            </p>
          )}
          {invoiceOrder?.customer_adjustment_note && (
            <p role="status" style={{ marginTop: 10, fontWeight: 800 }}>
              {invoiceOrder.customer_adjustment_note}
            </p>
          )}
          {invoiceOrder?.customer_payment_requested_at &&
            invoiceOrder.payment_request_status === "requested" && (
              <p
                role="status"
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  background: "#edf9f2",
                  color: "#17684d",
                  fontWeight: 800,
                }}
              >
                تم اعتماد الطلب من الإدارة. يرجى اتباع تعليمات السداد المتفق عليها مع الشركة؛ هذا
                الإشعار لا يؤكد استلام دفعة.
              </p>
            )}
        </section>
      )}
    </WorkspaceShell>
  );
}

export function CustomerStatementPage() {
  return (
    <Gate>
      <Statement />
    </Gate>
  );
}
function formatAccountMoney(value: number | string, currency: string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) return "غير متاح";
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
}
function Statement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<(PaymentAmount & { paid_at: string })[]>([]);
  const [summary, setSummary] = useState<AccountStatementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSummary(null);
    try {
      const r = await supabase.rpc("get_customer_account_statement");
      if (r.error) throw new Error("تعذر قراءة كشف الحساب. تحقق من نشر مخطط المالية.");
      const payload = validateAccountStatementPayload(r.data);
      setInvoices(payload.invoices);
      setPayments(payload.payments);
      setSummary(payload.summary);
    } catch (cause) {
      setInvoices([]);
      setPayments([]);
      setSummary(null);
      setError(cause instanceof Error ? cause.message : "تعذر التحقق من كشف الحساب.");
    } finally {
      setLoading(false);
    }
  }, []);
  const downloadStatementPdf = useCallback(async () => {
    setPdfBusy(true);
    setPdfError("");
    try {
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;
      if (sessionResult.error || !accessToken) {
        throw new Error("سجّل الدخول مجددًا لتنزيل كشف الحساب.");
      }

      const response = await fetch("/api/statement-pdf", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/pdf",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        let message = "تعذر إنشاء ملف PDF من كشف الحساب.";
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string" && body.error.length < 240) message = body.error;
        } catch {
          // Keep the safe fallback when the server did not return JSON.
        }
        throw new Error(message);
      }

      if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("application/pdf")) {
        throw new Error("استجابة المستند غير صحيحة؛ لم يتم تنزيل الملف.");
      }
      const blob = await response.blob();
      if (blob.size < 500 || blob.type && !blob.type.toLowerCase().includes("application/pdf")) {
        throw new Error("ملف PDF فارغ أو غير صالح.");
      }

      const objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "aghbari-account-statement.pdf";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : "تعذر تنزيل كشف الحساب.");
    } finally {
      setPdfBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const statementMayBePartial = Boolean(
    summary && (summary.invoice_count > invoices.length || summary.payment_count > payments.length),
  );
  return (
    <WorkspaceShell title="كشف الحساب" subtitle="ملخص من الفواتير والمدفوعات المسجلة فقط.">
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <button style={primary} onClick={() => void downloadStatementPdf()} disabled={pdfBusy}>
          <FileText size={15} /> {pdfBusy ? "جارٍ إنشاء PDF..." : "تنزيل PDF عربي"}
        </button>
        <button style={secondary} onClick={() => window.print()}>
          <Printer size={15} /> طباعة من المتصفح
        </button>
      </div>
      {error && <ErrorBox message={error} retry={() => void load()} />}
      {pdfError && <ErrorBox message={pdfError} retry={() => void downloadStatementPdf()} />}
      {loading ? (
        <p role="status">جارٍ تحميل كشف الحساب...</p>
      ) : (
        <>
          {!summary && (
            <p role="alert" style={{ ...quiet, color: "#9b4e22", marginBottom: 12 }}>
              لا يمكن عرض أرصدة محسوبة من تفاصيل محدودة؛ لم يُعرض أي إجمالي حتى يُثبت ملخص الدفتر الكامل.
            </p>
          )}
          {summary && (
            <p role="status" style={{ ...quiet, marginBottom: 12 }}>
              السجل الكامل: {formatNumber(summary.invoice_count)} فاتورة و{formatNumber(summary.payment_count)} دفعة.
            </p>
          )}
          {statementMayBePartial && (
            <p role="status" style={{ ...quiet, color: "#9b4e22", marginBottom: 12 }}>
              تفاصيل العرض محدودة بأحدث 200 فاتورة و500 دفعة. إجماليات الأرصدة أدناه محسوبة خادميًا من كامل دفتر العميل.
            </p>
          )}
          {summary ? (
            summary.totals_by_currency.length ? (
              <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                {summary.totals_by_currency.map((currencyBalance) => (
                  <section key={currencyBalance.currency} style={card}>
                    <h3 style={{ margin: "0 0 12px", color: "#087f8d" }}>
                      ملخص الرصيد بعملة {currencyBalance.currency}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
                      {(
                        [
                          ["إجمالي الفواتير", currencyBalance.invoiced],
                          ["المدفوع المسجل", currencyBalance.paid],
                          ["المتبقي المستحق", currencyBalance.outstanding],
                        ] as const
                      ).map(([label, value]) => (
                        <article key={label} style={{ ...card, boxShadow: "none" }}>
                          <span style={quiet}>{label}</span>
                          <strong
                            style={{
                              display: "block",
                              fontSize: 23,
                              marginTop: 8,
                              color: label === "المتبقي المستحق" ? "#9b4e22" : "#087f8d",
                            }}
                          >
                            {formatAccountMoney(value, currencyBalance.currency)}
                          </strong>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p style={{ ...quiet, marginBottom: 18 }}>لا توجد أرصدة مالية مسجلة.</p>
            )
          ) : null}
          <section style={{ ...card, padding: 0, overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: "right", background: "#f4f8f9" }}>
                  <th style={{ padding: 12 }}>التاريخ</th>
                  <th>المستند</th>
                  <th>الإجمالي</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const rowValid =
                    isAccountStatementMoney(i.total_amount) &&
                    isAccountStatementMoney(i.paid_amount) &&
                    isAccountStatementMoney(i.outstanding_amount) &&
                    typeof i.currency === "string";
                  return (
                    <tr key={i.id} style={{ borderTop: "1px solid #edf2f3" }}>
                      <td style={{ padding: 12 }}>{formatDateShort(i.issued_at)}</td>
                      <td>
                        <strong>{i.invoice_number}</strong>
                      </td>
                      <td>{rowValid ? formatAccountMoney(i.total_amount!, i.currency) : "غير متاح"}</td>
                      <td>{rowValid ? formatAccountMoney(i.paid_amount!, i.currency) : "غير متاح"}</td>
                      <td>{rowValid ? formatAccountMoney(i.outstanding_amount!, i.currency) : "غير متاح"}</td>
                      <td>
                        {i.status === "paid"
                          ? "مدفوعة"
                          : i.status === "partially_paid"
                            ? "جزئيًا"
                            : i.status === "void"
                              ? "ملغاة"
                              : "مستحقة"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!invoices.length && <p style={{ padding: 14 }}>لا توجد فواتير ضمن أحدث التفاصيل المعادة.</p>}
          </section>
          <p style={quiet}>
            الدفعات المعروضة: {formatNumber(payments.length)} من أصل {formatNumber(summary?.payment_count ?? 0)} دفعة في السجل الكامل.
          </p>
        </>
      )}
    </WorkspaceShell>
  );
}

export function QuoteWorkspacePage() {
  return (
    <Gate>
      <Quotes />
    </Gate>
  );
}
function Quotes() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteItems, setQuoteItems] = useState<Record<string, QuoteLine[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const tenantScope = await getCurrentTenantScope().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "تعذر تحديد المؤسسة الحالية.");
      setLoading(false);
      return null;
    });
    if (!tenantScope) return;
    const { organizationId: orgId } = tenantScope;
    const [p, q] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,item_code,barcode,unit,status")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("name")
        .limit(500),
      supabase
        .from("sales_quotes")
        .select("id,quote_number,status,notes,response_note,created_at,quoted_at,valid_until")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (p.error || q.error)
      setError("تعذر تحميل المنتجات أو عروض الأسعار. تحقق من نشر ترحيل قاعدة البيانات.");
    else {
      try {
        const rows = (p.data ?? []) as Array<{ id: string; [key: string]: unknown }>;
        const priceMap = await fetchResolvedProductPrices(rows.map((row) => row.id));
        setProducts(rows.map((row) => ({ ...row, base_price: priceMap.get(row.id)! })) as Product[]);
      } catch (priceError) {
        setProducts([]);
        setError(priceError instanceof Error ? priceError.message : "تعذر تحميل سعر فئة حسابك.");
      }
      const quoteRows = (q.data ?? []) as Quote[];
      setQuotes(quoteRows);
      if (quoteRows.length) {
        const lineRows = await supabase
          .from("sales_quote_items")
          .select(
            "id,quote_id,product_id,item_code,product_name_snapshot,unit_snapshot,requested_quantity,target_unit_price,quoted_unit_price",
          )
          .in(
            "quote_id",
            quoteRows.map((x) => x.id),
          )
          .order("created_at");
        if (lineRows.error) setError("تعذر قراءة أسعار العروض.");
        else {
          const grouped: Record<string, QuoteLine[]> = {};
          for (const row of (lineRows.data ?? []) as QuoteLine[]) {
            const key = row.quote_id ?? "";
            if (key) (grouped[key] ??= []).push(row);
          }
          setQuoteItems(grouped);
        }
      } else setQuoteItems({});
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = products.filter((p) => matchesArabicCatalogSearch(p, query));
  async function request(e: FormEvent) {
    e.preventDefault();
    const lines = Object.entries(quantities)
      .filter(([, q]) => Number.isInteger(q) && q > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
    if (!lines.length) {
      setError("اختر صنفًا واحدًا على الأقل وحدد كميته.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await supabase.rpc("request_sales_quote", { p_lines: lines, p_notes: notes.trim() });
    if (r.error)
      setError(
        r.error.message.includes("approved customer")
          ? "حسابك التجاري بانتظار الاعتماد قبل طلب عرض سعر."
          : "تعذر إرسال الطلب: " + r.error.message,
      );
    else {
      setQuantities({});
      setNotes("");
      setNotice("تم إرسال طلب عرض السعر. لم يتم إنشاء طلب بيع أو فرض سعر.");
      await load();
    }
    setBusy(false);
  }
  async function answer(id: string, accept: boolean) {
    setBusy(true);
    setError("");
    const r = await supabase.rpc("customer_respond_to_quote", { p_quote_id: id, p_accept: accept });
    if (r.error) setError("تعذر تحديث العرض: " + r.error.message);
    else {
      setNotice(
        accept ? "سُجلت موافقتك على الأسعار. يلزم إنشاء طلب منفصل للشراء." : "تم رفض العرض.",
      );
      await load();
    }
    setBusy(false);
  }
  const label = (s: string) =>
    ({
      requested: "بانتظار التسعير",
      quoted: "تم التسعير",
      accepted: "مقبول",
      rejected: "مرفوض",
      expired: "منتهي",
    })[s] ?? s;
  return (
    <WorkspaceShell
      title="عروض الأسعار"
      subtitle="اطلب تسعيرًا تجاريًا موثقًا، ثم راجع رد فريق الأغبري."
    >
      {notice && (
        <div role="status" style={{ ...card, borderColor: "#a8d8c6", marginBottom: 12 }}>
          {notice}
        </div>
      )}
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <form onSubmit={request} style={{ ...card, display: "grid", gap: 12, marginBottom: 18 }}>
        <label>
          بحث في المنتجات
          <input
            style={{ ...field, marginTop: 6 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم الصنف أو الرمز أو الباركود"
          />
        </label>
        {loading ? (
          <p role="status">جارٍ تحميل المنتجات...</p>
        ) : (
          <div
            style={{
              maxHeight: 340,
              overflow: "auto",
              border: "1px solid #e6eeee",
              borderRadius: 10,
            }}
          >
            {visible.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 100px",
                  gap: 10,
                  alignItems: "center",
                  padding: 10,
                  borderBottom: "1px solid #edf2f3",
                }}
              >
                <div>
                  <strong>{p.name}</strong>
                  <div style={quiet}>
                    {p.item_code} · {p.unit} · السعر الحالي {formatCurrency(Number(p.base_price))}
                  </div>
                </div>
                <input
                  aria-label={"كمية " + p.name}
                  style={field}
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  value={quantities[p.id] ?? ""}
                  onChange={(e) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [p.id]: Math.min(10000, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  placeholder="الكمية"
                />
              </div>
            ))}
          </div>
        )}
        <label>
          ملاحظات
          <textarea
            style={{ ...field, minHeight: 75, marginTop: 6 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            placeholder="الكميات الشهرية أو موعد التوريد المطلوب"
          />
        </label>
        <button style={primary} type="submit" disabled={busy || loading}>
          <Send size={16} />
          {busy ? "جارٍ الإرسال..." : "إرسال طلب عرض سعر"}
        </button>
      </form>
      <h2 style={{ fontSize: 19 }}>عروضي السابقة</h2>
      {loading ? (
        <p role="status">جارٍ تحميل العروض...</p>
      ) : !quotes.length ? (
        <EmptyBox>لم ترسل عروض أسعار بعد.</EmptyBox>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {quotes.map((q) => (
            <article key={q.id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <strong>{q.quote_number}</strong>
                <span
                  style={{
                    borderRadius: 20,
                    padding: "4px 10px",
                    background: "#eff7f7",
                    color: "#087f8d",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {label(q.status)}
                </span>
              </div>
              <p style={quiet}>
                تاريخ الطلب: {formatDate(q.created_at)}
                {q.valid_until ? " · صالح حتى " + formatDateShort(q.valid_until) : ""}
              </p>
              {q.notes && <p>{q.notes}</p>}
              {(quoteItems[q.id] ?? []).length > 0 && (
                <div style={{ margin: "10px 0", borderTop: "1px solid #edf2f3", paddingTop: 8 }}>
                  {(quoteItems[q.id] ?? []).map((line) => (
                    <div
                      key={line.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "5px 0",
                      }}
                    >
                      <span>
                        {line.product_name_snapshot} ×{" "}
                        {formatNumber(Number(line.requested_quantity))}
                      </span>
                      <strong>
                        {line.quoted_unit_price == null
                          ? "بانتظار التسعير"
                          : formatCurrency(Number(line.quoted_unit_price)) + " / وحدة"}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              {q.response_note && (
                <p style={{ ...card, background: "#f8fbfb" }}>{q.response_note}</p>
              )}
              {q.status === "quoted" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button disabled={busy} style={primary} onClick={() => void answer(q.id, true)}>
                    <CheckCircle2 size={16} /> الموافقة على الأسعار
                  </button>
                  <button
                    disabled={busy}
                    style={secondary}
                    onClick={() => void answer(q.id, false)}
                  >
                    رفض العرض
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function ReorderWorkspacePage() {
  return (
    <Gate>
      <Reorder />
    </Gate>
  );
}
function Reorder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cartScopeKey = createOfflineCartScopeKey(
    user?.profileId ?? null,
    typeof window === "undefined" ? "server-render" : window.location.origin,
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<ReorderTemplate[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState("طلب متكرر");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    const tenantScope = await getCurrentTenantScope().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "تعذر تحديد المؤسسة الحالية.");
      return null;
    });
    if (!tenantScope) return;
    const { organizationId: orgId } = tenantScope;
    const [p, t] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,item_code,barcode,unit,status")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("name")
        .limit(500),
      supabase
        .from("reorder_templates")
        .select("id,name,created_at,updated_at,source_order_id")
        .order("updated_at", { ascending: false })
        .limit(100),
    ]);
    if (p.error || t.error)
      setError("تعذر تحميل المنتجات أو قوالب إعادة الطلب. تحقق من ترحيل قاعدة البيانات.");
    else {
      try {
        const rows = (p.data ?? []) as Array<{ id: string; [key: string]: unknown }>;
        const priceMap = await fetchResolvedProductPrices(rows.map((row) => row.id));
        setProducts(rows.map((row) => ({ ...row, base_price: priceMap.get(row.id)! })) as Product[]);
      } catch (priceError) {
        setProducts([]);
        setError(priceError instanceof Error ? priceError.message : "تعذر تحميل سعر فئة حسابك.");
      }
      setTemplates((t.data ?? []) as ReorderTemplate[]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = products.filter((p) => matchesArabicCatalogSearch(p, query));
  async function save(e: FormEvent) {
    e.preventDefault();
    const lines = Object.entries(quantities)
      .filter(([, q]) => Number.isInteger(q) && q > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
    if (name.trim().length < 2 || !lines.length) {
      setError("اكتب اسم القالب واختر صنفًا واحدًا على الأقل.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await supabase.rpc("save_reorder_template", {
      p_name: name.trim(),
      p_lines: lines,
      p_source_order_id: null,
    });
    if (r.error) setError("تعذر حفظ القالب: " + r.error.message);
    else {
      setNotice("تم حفظ قالب إعادة الطلب.");
      setQuantities({});
      await load();
    }
    setBusy(false);
  }
  async function apply(t: ReorderTemplate) {
    setBusy(true);
    setError("");
    const r = await supabase
      .from("reorder_template_items")
      .select("product_id,quantity")
      .eq("template_id", t.id);
    if (r.error) {
      setError("تعذر قراءة أصناف القالب.");
      setBusy(false);
      return;
    }
    const draft = normalizeCartDraft(
      (r.data ?? [])
        .filter((x: ReorderTemplateLine) => x.product_id)
        .map((x: ReorderTemplateLine) => ({
          product_id: x.product_id as string,
          quantity: Number(x.quantity),
        })),
    );
    if (!draft.length) {
      setError("لا يحتوي القالب على أصناف متاحة.");
      setBusy(false);
      return;
    }
    try {
      if (!user?.profileId) throw new Error("سجّل الدخول قبل نقل قالب إعادة الطلب إلى السلة.");
      appendOfflineCartMutation(localStorage, cartScopeKey, {
        id: createOfflineCartMutationId(),
        kind: "merge",
        lines: draft,
      }, []);
      writeLegacyCartOwner(localStorage, cartScopeKey);
      void navigate({ to: "/" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ مسودة إعادة الطلب على هذا الجهاز.");
    }
    setBusy(false);
  }
  return (
    <WorkspaceShell
      title="إعادة الطلب"
      subtitle="احفظ قوالب متكررة ثم حمّل كمياتها إلى السلة لمراجعتها قبل الإرسال."
    >
      {notice && (
        <div role="status" style={{ ...card, marginBottom: 12 }}>
          {notice}
        </div>
      )}
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <form onSubmit={save} style={{ ...card, display: "grid", gap: 12, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>حفظ قالب جديد</h2>
        <label>
          اسم القالب
          <input
            style={{ ...field, marginTop: 6 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </label>
        <label>
          بحث في المنتجات
          <input
            style={{ ...field, marginTop: 6 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم الصنف أو الرمز"
          />
        </label>
        <div
          style={{
            maxHeight: 320,
            overflow: "auto",
            border: "1px solid #e6eeee",
            borderRadius: 10,
          }}
        >
          {visible.map((p) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 95px",
                gap: 10,
                alignItems: "center",
                padding: 10,
                borderBottom: "1px solid #edf2f3",
              }}
            >
              <div>
                <strong>{p.name}</strong>
                <div style={quiet}>
                  {p.item_code} · {formatCurrency(Number(p.base_price))}
                </div>
              </div>
              <input
                style={field}
                type="number"
                min="0"
                max="10000"
                step="1"
                aria-label={"كمية " + p.name}
                value={quantities[p.id] ?? ""}
                onChange={(e) =>
                  setQuantities((prev) => ({
                    ...prev,
                    [p.id]: Math.min(10000, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                placeholder="الكمية"
              />
            </div>
          ))}
        </div>
        <button type="submit" style={primary} disabled={busy}>
          <Save size={16} />
          {busy ? "جارٍ الحفظ..." : "حفظ القالب"}
        </button>
      </form>
      <h2 style={{ fontSize: 19 }}>قوالبي المحفوظة</h2>
      {!templates.length ? (
        <EmptyBox>ستظهر هنا القوالب التي تحفظها.</EmptyBox>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {templates.map((t) => (
            <article
              key={t.id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>{t.name}</strong>
                <p style={quiet}>آخر تحديث: {formatDateShort(t.updated_at)}</p>
              </div>
              <button style={primary} disabled={busy} onClick={() => void apply(t)}>
                <ShoppingCart size={16} /> تحميل إلى السلة
              </button>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

export function BarcodeWorkspacePage() {
  return (
    <Gate>
      <Barcode />
    </Gate>
  );
}
function Barcode() {
  const { user } = useAuth();
  const cartScopeKey = createOfflineCartScopeKey(
    user?.profileId ?? null,
    typeof window === "undefined" ? "server-render" : window.location.origin,
  );
  const [value, setValue] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate();
  const lookup = useCallback(
    async (raw = value) => {
      const code = raw.trim();
      if (!code) {
        setError("أدخل رقم الباركود أو رمز الصنف.");
        return;
      }
      if (code.length > 100) {
        setError("الرمز يتجاوز الحد المسموح.");
        return;
      }
      setBusy(true);
      setError("");
      setProduct(null);
      const tenantScope = await getCurrentTenantScope().catch((cause) => {
        setError(cause instanceof Error ? cause.message : "تعذر تحديد المؤسسة الحالية.");
        setBusy(false);
        return null;
      });
      if (!tenantScope) return;
      const { organizationId: orgId } = tenantScope;
      let r = await supabase
        .from("products")
        .select("id,name,item_code,barcode,unit,status")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .eq("barcode", code)
        .maybeSingle();
      if (!r.data && !r.error)
        r = await supabase
          .from("products")
          .select("id,name,item_code,barcode,unit,status")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .eq("item_code", code)
          .maybeSingle();
      if (r.error) setError("تعذر البحث في الكتالوج.");
      else if (!r.data) setError("لم نعثر على صنف بهذا الرمز.");
      else {
        try {
          const priceMap = await fetchResolvedProductPrices([r.data.id]);
          setProduct({ ...r.data, base_price: priceMap.get(r.data.id)! } as Product);
        } catch (priceError) {
          setError(priceError instanceof Error ? priceError.message : "تعذر تحميل سعر فئة حسابك.");
        }
      }
      setBusy(false);
    },
    [value],
  );
  useEffect(() => {
    if (!scanning) return;
    let active = true;
    let stream: MediaStream | null = null;
    let frame = 0;
    let video: HTMLVideoElement | null = null;
    type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
    type DetectorCtor = new (options: { formats: string[] }) => Detector;

    const setup = async () => {
      try {
        const BarcodeCtor = (window as unknown as { BarcodeDetector?: DetectorCtor })
          .BarcodeDetector;
        if (!BarcodeCtor) {
          setCameraError("هذا المتصفح لا يدعم قراءة الباركود بالكاميرا. استخدم الإدخال اليدوي.");
          setScanning(false);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        video = videoRef.current;
        if (!active || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        const detector = new BarcodeCtor({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
        });
        const scan = async () => {
          if (!active || !video) return;
          try {
            const hits = await detector.detect(video);
            if (hits[0]?.rawValue) {
              setValue(hits[0].rawValue);
              setScanning(false);
              return;
            }
          } catch {
            // Ignore one unreadable frame and continue scanning.
          }
          frame = requestAnimationFrame(() => void scan());
        };
        void scan();
      } catch {
        setCameraError("تعذر فتح الكاميرا. اسمح بالوصول إليها عبر HTTPS أو استخدم الإدخال اليدوي.");
        setScanning(false);
      }
    };
    void setup();
    return () => {
      active = false;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [scanning]);
  async function add() {
    if (!product) return;
    try {
      if (!user?.profileId) throw new Error("سجّل الدخول قبل إضافة الصنف إلى سلتك.");
      appendOfflineCartMutation(localStorage, cartScopeKey, {
        id: createOfflineCartMutationId(),
        kind: "adjust",
        product_id: product.id,
        delta: 1,
      }, []);
      writeLegacyCartOwner(localStorage, cartScopeKey);
      void navigate({ to: "/" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الصنف في سجل السلة المحلي.");
    }
  }
  return (
    <WorkspaceShell
      title="ماسح الباركود"
      subtitle="اقرأ بالكاميرا في المتصفحات المدعومة أو استخدم البحث اليدوي."
    >
      {error && <ErrorBox message={error} />}
      {cameraError && <ErrorBox message={cameraError} />}
      <section style={{ ...card, display: "grid", gap: 12 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            autoComplete="off"
            aria-label="رقم الباركود"
            style={{ ...field, flex: "1 1 260px" }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="امسح الرمز أو اكتب رقم الباركود"
          />
          <button type="submit" style={primary} disabled={busy}>
            <Search size={16} />
            {busy ? "جارٍ البحث..." : "بحث"}
          </button>
          <button
            type="button"
            style={secondary}
            onClick={() => {
              setCameraError("");
              setScanning((v) => !v);
            }}
          >
            <ScanLine size={16} />
            {scanning ? "إيقاف الكاميرا" : "فتح الكاميرا"}
          </button>
        </form>
        {scanning && (
          <div style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: "100%", borderRadius: 12, background: "#111" }}
            />
            <p style={quiet}>وجّه الكاميرا نحو الباركود بإضاءة جيدة.</p>
          </div>
        )}
        {product && (
          <article style={{ ...card, borderColor: "#a8d8c6" }}>
            <h2 style={{ margin: "0 0 6px" }}>{product.name}</h2>
            <p style={quiet}>
              رمز الصنف: {product.item_code} · الباركود: {product.barcode ?? "غير مسجل"}
            </p>
            <strong style={{ fontSize: 22, color: "#087f8d" }}>
              {formatCurrency(Number(product.base_price))}
            </strong>
            <span style={{ marginInlineStart: 8 }}>/ {product.unit}</span>
            <div style={{ marginTop: 14 }}>
              <button style={primary} onClick={() => void add()}>
                <ShoppingCart size={16} /> أضف إلى السلة
              </button>
            </div>
          </article>
        )}
      </section>
    </WorkspaceShell>
  );
}

export function CommerceAssistantPage() {
  return (
    <Gate>
      <Assistant />
    </Gate>
  );
}
function Assistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function ask(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) {
      setError("اكتب سؤالك أولًا.");
      return;
    }
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const intent = classifyAssistantIntent(q);
      if (intent === "offline_help")
        setAnswer(
          "افتح صفحة «دون اتصال» لعرض الكتالوج المخزن سابقًا ومسودة السلة. إرسال الطلب وتأكيد السعر يحتاجان اتصالًا بالخادم.",
        );
      else if (intent === "order_status") {
        const r = await supabase
          .from("orders")
          .select("order_number,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (r.error) throw r.error;
        setAnswer(
          summarizeCustomerOrderStatuses((r.data ?? []) as AssistantOrderRow[], formatDateShort),
        );
      } else if (intent === "invoice_help") {
        const r = await supabase
          .from("customer_invoices")
          .select("invoice_number,status,issued_at")
          .order("issued_at", { ascending: false })
          .limit(100);
        if (r.error) throw new Error("تعذر الوصول إلى الفواتير. تحقق من نشر مخطط المالية.");
        setAnswer(
          summarizeCustomerInvoiceStatuses(
            (r.data ?? []) as AssistantInvoiceStatusRow[],
            formatDateShort,
          ),
        );
      } else if (intent === "catalog_search") {
        const { organizationId: orgId } = await getCurrentTenantScope();
        const r = await supabase
          .from("products")
          .select("id,name,item_code,barcode,unit,status")
          .eq("organization_id", orgId)
          .eq("status", "active")
          .order("name")
          .limit(300);
        if (r.error) throw r.error;
        const tokens = q
          .split(/\s+/)
          .filter(
            (w) =>
              w.length > 2 &&
              !/^(هل|يوجد|عندي|عندكم|من|في|على|ما|هو|هي|ابحث|لي|عن|سعر|كم|الرجاء|اريد|أريد)$/.test(
                w,
              ),
          );
        const matches = ((r.data ?? []) as Array<Omit<AssistantProductRow, "base_price">>)
          .filter((p) =>
            tokens.some((t) =>
              (p.name + " " + p.item_code + " " + (p.barcode ?? ""))
                .toLocaleLowerCase("ar")
                .includes(t.toLocaleLowerCase("ar")),
            ),
          )
          .slice(0, 8);
        const priceMap = await fetchResolvedProductPrices(matches.map((product) => product.id));
        const hits = matches.map((product) => ({
          ...product,
          base_price: priceMap.get(product.id)!,
        })) as AssistantProductRow[];
        setAnswer(
          hits.length
            ? "نتائج من الكتالوج:\n" +
                hits
                  .map(
                    (p: AssistantProductRow) =>
                      p.name +
                      " (" +
                      p.item_code +
                      ") — " +
                      formatCurrency(Number(p.base_price)) +
                      "/" +
                      p.unit,
                  )
                  .join("\n")
            : "لم أعثر على صنف مطابق في الكتالوج الحالي.",
        );
      } else {
        // Verified orders, invoices and prices remain on deterministic, account-scoped paths above.
        // Only general guidance reaches the model, and the gateway applies privacy/quota gates again.
        try {
          const { data, error: gatewayError } = await supabase.functions.invoke("ai-gateway", {
            body: { action: "ask", question: q },
          });
          const result = data as { answer?: unknown } | null;
          setAnswer(!gatewayError && typeof result?.answer === "string"
            ? result.answer
            : "المساعد الخارجي غير متاح أو تجاوز حدود الاستخدام. لا تزال بيانات الحساب الفعلية متاحة من شاشات الطلبات والفواتير والكتالوج.");
        } catch {
          setAnswer("المساعد الخارجي غير متاح الآن. يمكنك متابعة الطلبات والفواتير والأسعار من الشاشات الموثقة داخل المتجر.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر استرجاع بيانات موثوقة.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkspaceShell
      title="المساعد الذكي"
      subtitle="مساعد تجاري يعتمد على بيانات حسابك الفعلية ولا يخترع أسعارًا أو حالات طلبات."
    >
      <section style={{ ...card, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "#e3f4f2",
              color: "#087f8d",
            }}
          >
            <Bot size={26} />
          </span>
          <div>
            <strong style={{ fontSize: 18 }}>مساعد الأغبري</strong>
            <p style={quiet}>الطلبات والفواتير والمنتجات والاتصال.</p>
          </div>
        </div>
        <form onSubmit={ask} style={{ display: "grid", gap: 10 }}>
          <textarea
            style={{ ...field, minHeight: 96 }}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="مثال: ما حالة طلبي الأخير؟ أو كم المتبقي في كشف حسابي؟"
          />
          <button style={primary} disabled={busy} type="submit">
            <Send size={16} />
            {busy ? "جارٍ فحص البيانات..." : "اسأل المساعد"}
          </button>
        </form>
        {error && <ErrorBox message={error} />}
        {answer && (
          <div
            role="status"
            style={{ ...card, whiteSpace: "pre-wrap", lineHeight: 1.9, background: "#f7fbfb" }}
          >
            {answer}
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}

export function OfflineWorkspacePage() {
  return (
    <Gate>
      <Offline />
    </Gate>
  );
}
function Offline() {
  const { user } = useAuth();
  const cartScopeKey = createOfflineCartScopeKey(
    user?.profileId ?? null,
    typeof window === "undefined" ? "server-render" : window.location.origin,
  );
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [cached, setCached] = useState(0);
  const [catalogRows, setCatalogRows] = useState<ReturnType<typeof sanitizePublicCatalogCache>>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const catalogQuery = catalogSearch.trim().toLocaleLowerCase();
  const matchingCatalogRows = catalogRows.filter((product) => {
    if (!catalogQuery) return true;
    return [
      product.name,
      product.item_code,
      product.barcode ?? "",
      product.category?.name ?? "",
    ].some((value) => String(value).toLocaleLowerCase().includes(catalogQuery));
  });
  const visibleCatalogRows = matchingCatalogRows.slice(0, 100);
  const refresh = useCallback(() => {
    try {
      let safeCatalog = [];
      try {
        safeCatalog = sanitizePublicCatalogCache(
          JSON.parse(localStorage.getItem(getOfflineCatalogCacheKey(cartScopeKey)) || "[]"),
        );
      } catch {
        localStorage.removeItem(getOfflineCatalogCacheKey(cartScopeKey));
      }

      // An old global cache has no trustworthy account scope. Scrub sensitive fields,
      // then remove it instead of replaying its inventory into an arbitrary account.
      try {
        const oldGlobalCache = localStorage.getItem("aghbari:catalog:v1");
        if (oldGlobalCache) {
          localStorage.setItem("aghbari:catalog:v1", JSON.stringify(sanitizePublicCatalogCache(JSON.parse(oldGlobalCache))));
          localStorage.removeItem("aghbari:catalog:v1");
        }
      } catch {
        localStorage.removeItem("aghbari:catalog:v1");
      }
      // Rewrite legacy caches through the allowlist so private staff fields never linger in storage.
      localStorage.setItem(getOfflineCatalogCacheKey(cartScopeKey), JSON.stringify(safeCatalog));
      setCached(safeCatalog.length);
      setCatalogRows(safeCatalog);
      const legacy = readLegacyCartDraftForScope(localStorage, cartScopeKey, safeCatalog.map((product) => product.id));
      const seedExists = localStorage.getItem(getOfflineCartLedgerPrefix(cartScopeKey) + "seed") !== null;
      const ledger = readOfflineCartLedger(localStorage, cartScopeKey, seedExists ? [] : legacy.lines);
      writeLegacyCartOwner(localStorage, cartScopeKey);
      setCartCount(ledger.lines.reduce((sum, line) => sum + line.quantity, 0));
    } catch {
      setCached(0);
      setCatalogRows([]);
      setCartCount(0);
    }
  }, [cartScopeKey]);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    refresh();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh]);
  async function sync() {
    if (!navigator.onLine) {
      setMessage("لا يوجد اتصال؛ ستظل النسخة المحلية محفوظة.");
      return;
    }
    setSyncing(true);
    setMessage("");
    try {
      const fetchedCatalog: unknown = await fetchProducts();
      if (!Array.isArray(fetchedCatalog)) {
        throw new Error("استجابة الكتالوج من الخادم غير صالحة؛ احتفظنا بالنسخة المحلية.");
      }
      const rows = sanitizePublicCatalogCache(fetchedCatalog);
      if (fetchedCatalog.length > 0 && rows.length === 0) {
        throw new Error("لم تتضمن استجابة الخادم أصنافًا صالحة؛ احتفظنا بالنسخة المحلية.");
      }
      localStorage.setItem(getOfflineCatalogCacheKey(cartScopeKey), JSON.stringify(rows));
      refresh();
      setMessage(
        "تم تحديث نسخة الكتالوج المحلية من الخادم: " +
          rows.length +
          " صنف، مع أرصدة المخزون والتصنيفات المتاحة.",
      );
    } catch {
      setMessage("تعذر تحديث الكتالوج؛ لم نغيّر النسخة المحلية.");
    } finally {
      setSyncing(false);
    }
  }
  function queue() {
    try {
      const catalog = sanitizePublicCatalogCache(JSON.parse(localStorage.getItem(getOfflineCatalogCacheKey(cartScopeKey)) || "[]"));
      const legacy = readLegacyCartDraftForScope(localStorage, cartScopeKey, catalog.map((product) => product.id));
      const seedExists = localStorage.getItem(getOfflineCartLedgerPrefix(cartScopeKey) + "seed") !== null;
      const ledger = readOfflineCartLedger(localStorage, cartScopeKey, seedExists ? [] : legacy.lines);
      const compacted = compactOfflineCartLedger(localStorage, cartScopeKey, ledger.lines);
      writeLegacyCartOwner(localStorage, cartScopeKey);
      setCartCount(compacted.lines.reduce((sum, line) => sum + line.quantity, 0));
      setMessage(
        "تم حفظ ومراجعة مسودة السلة المحلية (" +
          compacted.lines.length +
          " صنف). هذه عملية محلية فقط؛ لن يُرسل الطلب أو يُعتمد السعر دون تحقق الخادم عند عودة الاتصال.",
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "تعذر حفظ مسودة السلة المحلية بأمان.");
    }
  }
  function addToLocalDraft(productId: string, productName: string) {
    try {
      if (!user?.profileId) throw new Error("سجّل الدخول قبل حفظ مسودة سلة مرتبطة بحسابك.");
      const next = appendOfflineCartMutation(localStorage, cartScopeKey, {
        id: createOfflineCartMutationId(),
        kind: "adjust",
        product_id: productId,
        delta: 1,
      }, []);
      writeLegacyCartOwner(localStorage, cartScopeKey);
      setCartCount(next.lines.reduce((sum, line) => sum + line.quantity, 0));
      setMessage(
        "تمت إضافة " + productName + " إلى مسودة السلة المحلية فقط. لم يُرسل طلب؛ السعر والمخزون يحتاجان تحقق الخادم عند عودة الاتصال.",
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "تعذر إضافة الصنف إلى المسودة المحلية.");
    }
  }
  return (
    <WorkspaceShell
      title="العمل دون اتصال"
      subtitle="كتالوج مخزن ومسودة سلة على هذا الجهاز. لا تُعتمد الطلبات أو المدفوعات دون الخادم."
    >
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        {online ? <Wifi size={28} color="#087f8d" /> : <WifiOff size={28} color="#b45309" />}
        <div>
          <strong>{online ? "متصل بالإنترنت" : "غير متصل بالإنترنت"}</strong>
          <p style={quiet}>حالة اتصال الجهاز لا تضمن صحة قاعدة البيانات.</p>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <article style={card}>
          <span style={quiet}>أصناف محفوظة</span>
          <strong style={{ fontSize: 25, display: "block", marginTop: 8 }}>
            {formatNumber(cached)}
          </strong>
        </article>
        <article style={card}>
          <span style={quiet}>كمية السلة</span>
          <strong style={{ fontSize: 25, display: "block", marginTop: 8 }}>
            {formatNumber(cartCount)}
          </strong>
        </article>
      </div>
      <section style={{ ...card, marginBottom: 14 }} aria-labelledby="offline-catalog-heading">
        <h2 id="offline-catalog-heading" style={{ marginTop: 0, fontSize: 18 }}>الكتالوج المحلي</h2>
        <label htmlFor="offline-catalog-search" style={{ ...quiet, display: "block", marginBottom: 8 }}>ابحث بالاسم أو رمز الصنف أو الباركود أو التصنيف</label>
        <input
          id="offline-catalog-search"
          aria-label="البحث في الكتالوج المحلي"
          type="search"
          dir="rtl"
          value={catalogSearch}
          onChange={(event) => setCatalogSearch(event.target.value)}
          placeholder="اسم الصنف أو الرمز..."
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, font: "inherit", marginBottom: 12, background: "#fff" }}
        />
        {catalogRows.length === 0 ? (
          <p role="status" style={quiet}>لا توجد أصناف محفوظة على هذا الجهاز. اتصل بالخادم ثم حدّث الكتالوج.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            {visibleCatalogRows.map((product) => (
              <article key={product.id} style={{ border: "1px solid #dbe5e7", borderRadius: 10, padding: 12 }}>
                <strong>{product.name}</strong>
                <p style={quiet}>رمز الصنف: {product.item_code} · الوحدة: {product.unit}</p>
                {product.category?.name && <p style={quiet}>التصنيف: {product.category.name}</p>}
                <p style={quiet}>السعر والمخزون الحاليان يحتاجان مراجعة الخادم؛ لا نعتمد قيمًا محلية قديمة.</p>
                <button style={secondary} onClick={() => addToLocalDraft(product.id, product.name)}>
                  إضافة إلى المسودة المحلية
                </button>
              </article>
            ))}
          </div>
        )}
        {matchingCatalogRows.length > 100 && (
          <p style={quiet}>يُعرض أول 100 صنف مطابق لتجنب تحميل قائمة كبيرة؛ أضف كلمات بحث لتضييق النتائج.</p>
        )}
        {catalogRows.length > 0 && matchingCatalogRows.length === 0 && <p role="status" style={quiet}>لا توجد أصناف مطابقة لبحثك.</p>}
      </section>
      <section style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={primary} onClick={() => void sync()} disabled={syncing || !online}>
          <RefreshCw size={16} />
          {syncing ? "جارٍ التحديث..." : "تحديث الكتالوج المحلي"}
        </button>
        <button style={secondary} onClick={queue}>
          <Save size={16} /> حفظ السلة كمسودة
        </button>
        <Link to="/" style={secondary as React.CSSProperties}>
          فتح المتجر
        </Link>
      </section>
      {message && (
        <p role="status" style={{ ...card, marginTop: 14 }}>
          {message}
        </p>
      )}
      <p style={{ ...quiet, marginTop: 14 }}>
        بعد عودة الإنترنت، راجع السلة والأسعار الحالية ثم أرسل الطلب بالطريقة المعتادة. لا نحفظ
        بيانات الفواتير أو الحسابات الحساسة دون اتصال.
      </p>
    </WorkspaceShell>
  );
}

export function StaffQuotesPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [chosen, setChosen] = useState<Quote | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [valid, setValid] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const r = await supabase
      .from("sales_quotes")
      .select("id,quote_number,status,notes,response_note,created_at,quoted_at,valid_until")
      .order("created_at", { ascending: false })
      .limit(100);
    if (r.error) setError("تعذر تحميل عروض الأسعار. تأكد من نشر ترحيل قاعدة البيانات.");
    else setQuotes((r.data ?? []) as Quote[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(q: Quote) {
    setChosen(q);
    setLines([]);
    const r = await supabase
      .from("sales_quote_items")
      .select(
        "id,product_id,item_code,product_name_snapshot,unit_snapshot,requested_quantity,target_unit_price,quoted_unit_price",
      )
      .eq("quote_id", q.id)
      .order("created_at");
    if (r.error) {
      setError("تعذر تحميل بنود العرض.");
      setChosen(null);
      return;
    }
    const rows = (r.data ?? []) as QuoteLine[];
    setLines(rows);
    setPrices(
      Object.fromEntries(
        rows.map((l) => [l.id, l.quoted_unit_price == null ? "" : String(l.quoted_unit_price)]),
      ),
    );
    setNote(q.response_note ?? "");
    setValid(q.valid_until?.slice(0, 10) ?? "");
  }
  async function send() {
    if (!chosen) return;
    const p = lines.map((l) => ({ item_id: l.id, unit_price: Number(prices[l.id]) }));
    if (!p.length || p.some((x) => !Number.isFinite(x.unit_price) || x.unit_price < 0)) {
      setError("أدخل سعرًا صالحًا لكل بند.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await supabase.rpc("respond_to_sales_quote", {
      p_quote_id: chosen.id,
      p_prices: p,
      p_response_note: note.trim(),
      p_valid_until: valid ? new Date(valid + "T23:59:59").toISOString() : null,
    });
    if (r.error) setError("تعذر حفظ التسعير: " + r.error.message);
    else {
      setMessage("تم حفظ العرض وإرساله للعميل.");
      setChosen(null);
      await load();
    }
    setBusy(false);
  }
  async function reject(q: Quote) {
    setBusy(true);
    const r = await supabase
      .from("sales_quotes")
      .update({
        status: "rejected",
        responded_by: user?.profileId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id);
    if (r.error) setError("تعذر تحديث العرض: " + r.error.message);
    else {
      setMessage("تم رفض طلب العرض.");
      await load();
    }
    setBusy(false);
  }
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, margin: 0 }}>إدارة عروض الأسعار</h1>
        <p style={quiet}>
          سعّر بنود الطلب ثم أرسل العرض للعميل. لا تغيّر هذه العملية أسعار الكتالوج.
        </p>
      </header>
      {message && (
        <div role="status" style={card}>
          {message}
        </div>
      )}
      {error && <ErrorBox message={error} retry={() => void load()} />}
      {loading ? (
        <p role="status">جارٍ تحميل العروض...</p>
      ) : !quotes.length ? (
        <EmptyBox>لا توجد طلبات عروض أسعار.</EmptyBox>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {quotes.map((q) => (
            <article key={q.id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <strong>{q.quote_number}</strong>
                <span>{q.status}</span>
              </div>
              <p style={quiet}>
                {formatDate(q.created_at)}
                {q.notes ? " · " + q.notes : ""}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={primary} disabled={busy} onClick={() => void open(q)}>
                  فتح / تسعير
                </button>
                {q.status !== "accepted" && q.status !== "rejected" && (
                  <button style={secondary} disabled={busy} onClick={() => void reject(q)}>
                    رفض الطلب
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {chosen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="تسعير عرض"
          style={{ ...card, display: "grid", gap: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 19 }}>تسعير {chosen.quote_number}</h2>
            <button style={secondary} onClick={() => setChosen(null)}>
              إغلاق
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ textAlign: "right", padding: 8 }}>الصنف</th>
                  <th>الكمية</th>
                  <th>السعر المطلوب</th>
                  <th>سعر العرض</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid #edf2f3" }}>
                    <td style={{ padding: 8 }}>
                      {l.product_name_snapshot}
                      <small style={{ display: "block", color: "#71868a" }}>{l.item_code}</small>
                    </td>
                    <td>
                      {formatNumber(Number(l.requested_quantity))} {l.unit_snapshot ?? ""}
                    </td>
                    <td>
                      {l.target_unit_price == null
                        ? "—"
                        : formatCurrency(Number(l.target_unit_price))}
                    </td>
                    <td>
                      <input
                        style={{ ...field, width: 140 }}
                        type="number"
                        min="0"
                        step="0.01"
                        value={prices[l.id] ?? ""}
                        onChange={(e) => setPrices((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label>
            رسالة للعميل
            <textarea
              style={{ ...field, minHeight: 70, marginTop: 6 }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
          </label>
          <label>
            صالح حتى (اختياري)
            <input
              style={{ ...field, marginTop: 6 }}
              type="date"
              value={valid}
              onChange={(e) => setValid(e.target.value)}
            />
          </label>
          <button style={primary} disabled={busy} onClick={() => void send()}>
            <Save size={16} />
            {busy ? "جارٍ الحفظ..." : "حفظ الأسعار وإرسال العرض"}
          </button>
        </section>
      )}
    </section>
  );
}

export function StaffFinancePage() {
  const { user } = useAuth();
  const canManageFinance = Boolean(
    user?.roles.some((role) => role === "admin" || role === "manager" || role === "accountant"),
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<
    (PaymentAmount & { paid_at?: string; payment_method?: string })[]
  >([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const r = await supabase.rpc("fetch_staff_finance_data");
    if (r.error) setError("تعذر تحميل المالية. تأكد من نشر الترحيل وصلاحيات الموظف.");
    else {
      const payload = (r.data ?? {}) as {
        invoices?: Invoice[];
        payments?: (PaymentAmount & { paid_at?: string; payment_method?: string })[];
      };
      setInvoices(payload.invoices ?? []);
      setPayments(payload.payments ?? []);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    if (canManageFinance) void load();
  }, [load, canManageFinance]);
  const outstanding = (i: Invoice) =>
    i.status === "void"
      ? 0
      : Math.max(
          0,
          Number(i.total_amount) -
            payments.filter((p) => p.invoice_id === i.id).reduce((s, p) => s + Number(p.amount), 0),
        );
  async function submit(e: FormEvent) {
    e.preventDefault();
    const i = invoices.find((x) => x.id === invoiceId),
      n = Number(amount);
    if (!i || !Number.isFinite(n) || n <= 0) {
      setError("اختر فاتورة وأدخل مبلغًا أكبر من صفر.");
      return;
    }
    if (n > outstanding(i)) {
      setError("المبلغ يتجاوز المتبقي على الفاتورة.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await supabase.rpc("record_customer_payment", {
      p_invoice_id: i.id,
      p_amount: n,
      p_payment_method: method,
      p_reference: reference.trim() || null,
      p_notes: notes.trim() || null,
    });
    if (r.error) setError("تعذر تسجيل الدفعة: " + r.error.message);
    else {
      setMessage("تم تسجيل الدفعة وتحديث حالة الفاتورة.");
      setAmount("");
      setReference("");
      setNotes("");
      await load();
    }
    setBusy(false);
  }
  if (!canManageFinance)
    return (
      <section className="panel" role="alert" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>صلاحية المحاسبة مطلوبة</h1>
        <p>هذا القسم متاح للمحاسب ولفريق الإدارة المخوّل فقط.</p>
      </section>
    );
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header>
        <h1 style={{ fontSize: 24, margin: 0 }}>الفواتير والتحصيل</h1>
        <p style={quiet}>تسجيل دفعة فعلية من خلال أمر خادمي يتحقق من المتبقي داخل معاملة واحدة.</p>
      </header>
      {message && (
        <div role="status" style={card}>
          {message}
        </div>
      )}
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <form
        onSubmit={submit}
        style={{
          ...card,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 12,
        }}
      >
        <label>
          الفاتورة
          <select
            style={{ ...field, marginTop: 6 }}
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            required
          >
            <option value="">اختر فاتورة</option>
            {invoices
              .filter((i) => i.status !== "void" && outstanding(i) > 0)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} — متبقٍ {formatCurrency(outstanding(i))}
                </option>
              ))}
          </select>
        </label>
        <label>
          المبلغ
          <input
            style={{ ...field, marginTop: 6 }}
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          طريقة الدفع
          <select
            style={{ ...field, marginTop: 6 }}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="cash">نقدًا</option>
            <option value="transfer">تحويل</option>
            <option value="card">بطاقة</option>
            <option value="other">أخرى</option>
          </select>
        </label>
        <label>
          مرجع العملية
          <input
            style={{ ...field, marginTop: 6 }}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={200}
          />
        </label>
        <label style={{ gridColumn: "1/-1" }}>
          ملاحظات
          <textarea
            style={{ ...field, minHeight: 65, marginTop: 6 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
          />
        </label>
        <button style={primary} disabled={busy || loading} type="submit">
          <Banknote size={16} />
          {busy ? "جارٍ تسجيل الدفعة..." : "تسجيل الدفعة"}
        </button>
      </form>
      {loading ? (
        <p role="status">جارٍ تحميل الفواتير...</p>
      ) : (
        <section style={{ ...card, padding: 0, overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ textAlign: "right", background: "#f4f8f9" }}>
                <th style={{ padding: 12 }}>الفاتورة</th>
                <th>الإصدار</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} style={{ borderTop: "1px solid #edf2f3" }}>
                  <td style={{ padding: 12 }}>{i.invoice_number}</td>
                  <td>{formatDateShort(i.issued_at)}</td>
                  <td>{formatCurrency(Number(i.total_amount))}</td>
                  <td>
                    {formatCurrency(
                      payments
                        .filter((p) => p.invoice_id === i.id)
                        .reduce((s, p) => s + Number(p.amount), 0),
                    )}
                  </td>
                  <td>{formatCurrency(outstanding(i))}</td>
                  <td>{i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}


export function CustomerAddressesPage() {
  const { user, ready } = useAuth();
  if (!ready) return <WorkspaceShell title="عناوين التوصيل" subtitle="جارٍ التحقق من الحساب"><p role="status">جارٍ التحقق من جلسة الحساب...</p></WorkspaceShell>;
  if (!user) return <Login />;
  if (user.isStaff) return <WorkspaceShell title="عناوين التوصيل" subtitle="مساحة حساب العميل"><ErrorBox message="هذه الشاشة مخصصة لحساب العميل. استخدم ملف العميل في لوحة الإدارة للوصول إلى العناوين وفق صلاحيتك." /></WorkspaceShell>;
  return <CustomerAddresses />;
}

const EMPTY_ADDRESS: CustomerAddressInput = {
  id: null, label: "", recipient_name: "", phone: "", address_line1: "",
  address_line2: "", city: "", region: "", postal_code: "", country: "YE",
  delivery_instructions: "", is_default: false,
};

function CustomerAddresses() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [draft, setDraft] = useState<CustomerAddressInput>({ ...EMPTY_ADDRESS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setAddresses(await fetchCustomerAddresses()); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل عناوين التوصيل."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function edit(a: CustomerAddress) {
    setError(""); setNotice("");
    setDraft({ id:a.id,label:a.label,recipient_name:a.recipient_name,phone:a.phone,
      address_line1:a.address_line1,address_line2:a.address_line2 ?? "",city:a.city,
      region:a.region ?? "",postal_code:a.postal_code ?? "",country:a.country,
      delivery_instructions:a.delivery_instructions ?? "",is_default:a.is_default });
  }
  function reset() { setDraft({ ...EMPTY_ADDRESS }); setError(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await saveCustomerAddress(draft);
      setNotice(draft.id ? "تم تحديث العنوان في الحساب." : "تم حفظ عنوان التوصيل في الحساب.");
      reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حفظ العنوان."); }
    finally { setSaving(false); }
  }
  async function remove(a: CustomerAddress) {
    if (deleting || saving || !window.confirm("هل تريد حذف العنوان «" + a.label + "»؟")) return;
    setDeleting(a.id); setError(""); setNotice("");
    try {
      await deleteCustomerAddress(a.id);
      setNotice("تم حذف العنوان وتعيين عنوان رئيسي بديل عند الحاجة.");
      if (draft.id === a.id) reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف العنوان."); }
    finally { setDeleting(null); }
  }

  const inputStyle: React.CSSProperties = { ...field, marginTop: 6 };
  type AddressTextField = Exclude<keyof CustomerAddressInput, "id" | "is_default">;
  const setText = (key: AddressTextField, value: string) => setDraft(d => ({ ...d, [key]: value }));
  return <WorkspaceShell title="عناوين التوصيل" subtitle="احفظ عناوين شركتك ومواقع الاستلام. يستخرج الخادم حساب العميل وصلاحياته ولا يقبل هوية العميل أو المؤسسة من المتصفح.">
    {error && <ErrorBox message={error} retry={() => void load()} />}
    {notice && <div role="status" style={{ ...card, borderColor:"#a8d7c0", color:"#17684d", marginBottom:14 }}>{notice}</div>}
    <section style={{ ...card, marginBottom:18 }}>
      <h2 style={{ margin:"0 0 14px",fontSize:19,display:"flex",alignItems:"center",gap:8 }}>
        {draft.id ? <Pencil size={18}/> : <Plus size={18}/>} {draft.id ? "تعديل عنوان التوصيل" : "إضافة عنوان توصيل"}
      </h2>
      <form onSubmit={submit}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12 }}>
          <label>اسم العنوان<input style={inputStyle} value={draft.label} onChange={e=>setText("label",e.target.value)} maxLength={50} required /></label>
          <label>اسم المستلم<input style={inputStyle} value={draft.recipient_name} onChange={e=>setText("recipient_name",e.target.value)} minLength={2} maxLength={120} autoComplete="name" required /></label>
          <label>رقم الهاتف<input style={inputStyle} type="tel" dir="auto" value={draft.phone} onChange={e=>setText("phone",e.target.value)} minLength={7} maxLength={32} autoComplete="tel" required /></label>
          <label>المدينة<input style={inputStyle} value={draft.city} onChange={e=>setText("city",e.target.value)} minLength={2} maxLength={100} autoComplete="address-level2" required /></label>
          <label>العنوان التفصيلي<input style={inputStyle} value={draft.address_line1} onChange={e=>setText("address_line1",e.target.value)} minLength={3} maxLength={180} autoComplete="street-address" required /></label>
          <label>تفاصيل إضافية<input style={inputStyle} value={draft.address_line2 ?? ""} onChange={e=>setText("address_line2",e.target.value)} maxLength={180} /></label>
          <label>المحافظة / المنطقة<input style={inputStyle} value={draft.region ?? ""} onChange={e=>setText("region",e.target.value)} maxLength={100} autoComplete="address-level1" /></label>
          <label>الرمز البريدي<input style={inputStyle} value={draft.postal_code ?? ""} onChange={e=>setText("postal_code",e.target.value)} maxLength={24} autoComplete="postal-code" /></label>
          <label>رمز الدولة<input style={inputStyle} value={draft.country} onChange={e=>setText("country",e.target.value)} minLength={2} maxLength={2} autoComplete="country" required /></label>
          <label style={{ gridColumn:"1/-1" }}>تعليمات للمندوب (اختياري)<textarea style={{ ...inputStyle,minHeight:76,resize:"vertical" }} value={draft.delivery_instructions ?? ""} onChange={e=>setText("delivery_instructions",e.target.value)} maxLength={1000} /></label>
        </div>
        <label style={{ display:"flex",alignItems:"center",gap:8,marginTop:14,fontWeight:750 }}>
          <input type="checkbox" checked={draft.is_default} onChange={e=>setDraft(d=>({...d,is_default:e.target.checked}))} /> اجعل هذا العنوان هو العنوان الرئيسي للتوصيل
        </label>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:16 }}>
          <button style={primary} type="submit" disabled={saving || loading}><Save size={16}/>{saving ? "جارٍ الحفظ..." : draft.id ? "حفظ التعديلات" : "حفظ العنوان"}</button>
          {draft.id && <button style={secondary} type="button" disabled={saving} onClick={reset}>إلغاء التعديل</button>}
        </div>
      </form>
    </section>
    <section style={{ ...card,padding:0,overflow:"hidden" }}>
      <header style={{ display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12,padding:16,borderBottom:"1px solid #edf2f3" }}>
        <h2 style={{ margin:0,fontSize:18 }}><MapPin size={18} style={{ verticalAlign:"middle",marginInlineEnd:6 }}/>العناوين المحفوظة</h2>
        <button type="button" style={secondary} onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> تحديث</button>
      </header>
      {loading ? <p role="status" style={{ padding:18 }}>جارٍ تحميل العناوين...</p> :
       addresses.length === 0 ? <EmptyBox><MapPin size={30}/><p>لا توجد عناوين محفوظة بعد.</p><p style={quiet}>أضف عنوانًا لتسهيل تجهيز الطلبات والتوصيل لاحقًا.</p></EmptyBox> :
       <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,padding:14 }}>
         {addresses.map(a=><article key={a.id} style={{ ...card,padding:16,borderColor:a.is_default ? "#83c8bc" : "#e0ecee" }}>
           <div style={{ display:"flex",justifyContent:"space-between",gap:10 }}>
             <div><h3 style={{ margin:0,fontSize:17 }}>{a.label}</h3>{a.is_default && <span style={{ display:"inline-block",marginTop:6,padding:"3px 8px",borderRadius:20,background:"#e8f7f1",color:"#17684d",fontSize:12,fontWeight:800 }}>العنوان الرئيسي</span>}</div><MapPin size={18} aria-hidden="true"/>
           </div>
           <p style={{ margin:"12px 0 4px",fontWeight:800 }}>{a.recipient_name}</p>
           <p dir="auto" style={{ margin:"0 0 4px",color:"#516b70" }}>{a.phone}</p>
           <p style={{ margin:"0 0 4px" }}>{a.address_line1}{a.address_line2 ? "، " + a.address_line2 : ""}</p>
           <p style={{ margin:"0 0 4px",color:"#516b70" }}>{[a.city,a.region,a.postal_code].filter(Boolean).join("، ")}</p>
           {a.delivery_instructions && <p style={{ ...quiet,margin:"8px 0 0" }}>تعليمات: {a.delivery_instructions}</p>}
           <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:14 }}>
             <button type="button" style={secondary} onClick={()=>edit(a)} disabled={saving || Boolean(deleting)}><Pencil size={14}/> تعديل</button>
             <button type="button" style={{ ...secondary,color:"#9b2626" }} onClick={()=>void remove(a)} disabled={Boolean(deleting) || saving}><Trash2 size={14}/>{deleting === a.id ? "جارٍ الحذف..." : "حذف"}</button>
           </div>
         </article>)}
       </div>}
    </section>
  </WorkspaceShell>;
}


export function CustomerCompanyContactsPage() {
  const { user, ready } = useAuth();
  if (!ready) return <WorkspaceShell title="جهات الاتصال بالشركة" subtitle="جارٍ التحقق من الحساب"><p role="status">جارٍ التحقق من جلسة الحساب...</p></WorkspaceShell>;
  if (!user) return <Login />;
  if (user.isStaff) return <WorkspaceShell title="جهات الاتصال بالشركة" subtitle="مساحة حساب العميل"><ErrorBox message="هذه الشاشة مخصصة لحساب العميل. استخدم ملف العميل في لوحة الإدارة للوصول إلى البيانات وفق صلاحيتك." /></WorkspaceShell>;
  return <CustomerCompanyContacts />;
}

const EMPTY_COMPANY_CONTACT: CustomerCompanyContactInput = {
  id: null, full_name: "", job_title: "", department: "", phone: "", email: "", is_primary: false,
};

function CustomerCompanyContacts() {
  const [contacts, setContacts] = useState<CustomerCompanyContact[]>([]);
  const [draft, setDraft] = useState<CustomerCompanyContactInput>({ ...EMPTY_COMPANY_CONTACT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setContacts(await fetchCustomerCompanyContacts()); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل جهات اتصال الشركة."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reset() { setDraft({ ...EMPTY_COMPANY_CONTACT }); setError(""); }
  function edit(contact: CustomerCompanyContact) {
    setError(""); setNotice("");
    setDraft({
      id: contact.id, full_name: contact.full_name, job_title: contact.job_title ?? "",
      department: contact.department ?? "", phone: contact.phone, email: contact.email ?? "",
      is_primary: contact.is_primary,
    });
  }
  const setText = (key: Exclude<keyof CustomerCompanyContactInput, "id" | "is_primary">, value: string) =>
    setDraft(d => ({ ...d, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await saveCustomerCompanyContact(draft);
      setNotice(draft.id ? "تم تحديث جهة الاتصال." : "تم حفظ جهة الاتصال.");
      reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حفظ جهة الاتصال."); }
    finally { setSaving(false); }
  }

  async function remove(contact: CustomerCompanyContact) {
    if (deleting || saving || !window.confirm("هل تريد حذف جهة الاتصال «" + contact.full_name + "»؟")) return;
    setDeleting(contact.id); setError(""); setNotice("");
    try {
      await deleteCustomerCompanyContact(contact.id);
      setNotice("تم حذف جهة الاتصال وتحديث جهة الاتصال الرئيسية عند الحاجة.");
      if (draft.id === contact.id) reset();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر حذف جهة الاتصال."); }
    finally { setDeleting(null); }
  }

  const inputStyle: React.CSSProperties = { ...field, marginTop: 6 };
  return <WorkspaceShell
    title="جهات الاتصال بالشركة"
    subtitle="أدر جهات الاتصال التشغيلية لشركتك. يستنتج الخادم حساب العميل والمؤسسة من الجلسة؛ هذه السجلات لا تنشئ حسابات دخول أو صلاحيات مستخدمين."
  >
    {error && <ErrorBox message={error} retry={() => void load()} />}
    {notice && <div role="status" style={{ ...card, borderColor: "#a8d7c0", color: "#17684d", marginBottom: 14 }}>{notice}</div>}
    <section style={{ ...card, marginBottom: 18 }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 19 }}>{draft.id ? "تعديل جهة اتصال" : "إضافة جهة اتصال"}</h2>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          <label>اسم جهة الاتصال<input style={inputStyle} value={draft.full_name} onChange={e => setText("full_name", e.target.value)} minLength={2} maxLength={120} autoComplete="name" required /></label>
          <label>رقم الهاتف<input style={inputStyle} type="tel" dir="auto" value={draft.phone} onChange={e => setText("phone", e.target.value)} minLength={7} maxLength={32} autoComplete="tel" required /></label>
          <label>البريد الإلكتروني<input style={inputStyle} type="email" dir="auto" value={draft.email ?? ""} onChange={e => setText("email", e.target.value)} maxLength={254} autoComplete="email" /></label>
          <label>المسمى الوظيفي<input style={inputStyle} value={draft.job_title ?? ""} onChange={e => setText("job_title", e.target.value)} maxLength={80} /></label>
          <label>القسم<input style={inputStyle} value={draft.department ?? ""} onChange={e => setText("department", e.target.value)} maxLength={80} /></label>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontWeight: 750 }}>
          <input type="checkbox" checked={draft.is_primary} onChange={e => setDraft(d => ({ ...d, is_primary: e.target.checked }))} />
          اجعلها جهة الاتصال الرئيسية
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <button style={primary} type="submit" disabled={saving || loading}>{saving ? "جارٍ الحفظ..." : draft.id ? "حفظ التعديلات" : "حفظ جهة الاتصال"}</button>
          {draft.id && <button style={secondary} type="button" disabled={saving} onClick={reset}>إلغاء التعديل</button>}
          <button style={secondary} type="button" disabled={loading} onClick={() => void load()}>تحديث القائمة</button>
        </div>
      </form>
    </section>
    <section style={{ ...card, padding: 0, overflow: "hidden" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 16, borderBottom: "1px solid #edf2f3" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>جهات الاتصال المحفوظة ({contacts.length})</h2>
      </header>
      {loading ? <p role="status" style={{ padding: 18 }}>جارٍ تحميل جهات الاتصال...</p> :
        contacts.length === 0 ? <EmptyBox><p>لا توجد جهات اتصال محفوظة بعد.</p><p style={quiet}>أضف مسؤول المشتريات أو المحاسب أو جهة الاستلام لتسهيل التواصل التجاري.</p></EmptyBox> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, padding: 14 }}>
          {contacts.map(contact => <article key={contact.id} style={{ ...card, padding: 16, borderColor: contact.is_primary ? "#83c8bc" : "#e0ecee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>{contact.full_name}</h3>
                {contact.is_primary && <span style={{ display: "inline-block", marginTop: 6, padding: "3px 8px", borderRadius: 20, background: "#e8f7f1", color: "#17684d", fontSize: 12, fontWeight: 800 }}>جهة الاتصال الرئيسية</span>}
              </div>
            </div>
            {(contact.job_title || contact.department) && <p style={{ margin: "10px 0 4px", color: "#516b70" }}>{[contact.job_title, contact.department].filter(Boolean).join(" · ")}</p>}
            <p dir="auto" style={{ margin: "8px 0 4px", fontWeight: 750 }}>{contact.phone}</p>
            {contact.email && <p dir="auto" style={{ margin: "0 0 4px", color: "#516b70" }}>{contact.email}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" style={secondary} onClick={() => edit(contact)} disabled={saving || Boolean(deleting)}>تعديل</button>
              <button type="button" style={{ ...secondary, color: "#9b2626" }} onClick={() => void remove(contact)} disabled={Boolean(deleting) || saving}>{deleting === contact.id ? "جارٍ الحذف..." : "حذف"}</button>
            </div>
          </article>)}
        </div>}
    </section>
  </WorkspaceShell>;
}
