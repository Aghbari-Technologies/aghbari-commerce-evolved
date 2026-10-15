import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Mail, Pencil, Plus, RefreshCw, Save, Trash2, Users, UserRound } from "lucide-react";
import { listCustomerContacts, saveCustomerContact, deleteCustomerContact, type CustomerContact, type CustomerContactInput } from "@/lib/customer-contacts";

type Props = { mode: "customer" | "admin"; customerId?: string; customerName?: string };
const EMPTY: CustomerContactInput = {
  id: null, customerId: null, full_name: "", job_title: "", phone: "", email: "",
  contact_type: "general", is_primary: false, is_active: true,
};
const TYPE_OPTIONS: Array<{ value: CustomerContact["contact_type"]; label: string }> = [
  { value: "general", label: "عامة" },
  { value: "purchasing", label: "المشتريات" },
  { value: "finance", label: "المالية" },
  { value: "warehouse", label: "المستودع والاستلام" },
  { value: "management", label: "الإدارة" },
];

export function CustomerContactsManager({ mode, customerId, customerName }: Props) {
  const [rows, setRows] = useState<CustomerContact[]>([]);
  const [draft, setDraft] = useState<CustomerContactInput>({ ...EMPTY, customerId: mode === "admin" ? customerId ?? null : null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await listCustomerContacts(mode === "admin" ? customerId ?? null : null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل جهات الاتصال.");
    } finally {
      setLoading(false);
    }
  }, [mode, customerId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setDraft({ ...EMPTY, customerId: mode === "admin" ? customerId ?? null : null });
  }, [mode, customerId]);

  function edit(row: CustomerContact) {
    setDraft({
      id: row.id,
      customerId: mode === "admin" ? customerId ?? null : null,
      full_name: row.full_name,
      job_title: row.job_title ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      contact_type: row.contact_type,
      is_primary: row.is_primary,
      is_active: row.is_active,
    });
    setError("");
    setNotice("");
  }

  function reset() {
    setDraft({ ...EMPTY, customerId: mode === "admin" ? customerId ?? null : null });
    setError("");
  }

  function update<K extends keyof CustomerContactInput>(key: K, value: CustomerContactInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || (mode === "admin" && !customerId)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveCustomerContact({ ...draft, customerId: mode === "admin" ? customerId ?? null : null });
      setNotice(draft.id ? "تم تحديث جهة الاتصال." : "تمت إضافة جهة الاتصال.");
      reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ جهة الاتصال.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: CustomerContact) {
    if (deletingId || saving || !window.confirm("هل تريد حذف جهة الاتصال «" + row.full_name + "»؟")) return;
    setDeletingId(row.id);
    setError("");
    setNotice("");
    try {
      await deleteCustomerContact(row.id, mode === "admin" ? customerId ?? null : null);
      setNotice("تم حذف جهة الاتصال مع تسجيل العملية وتعيين رئيسي بديل عند الحاجة.");
      if (draft.id === row.id) reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف جهة الاتصال.");
    } finally {
      setDeletingId(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", marginTop: 6,
    border: "1px solid #d5e4e5", borderRadius: 10, background: "#fff", color: "#18383c",
  };
  const title = mode === "admin"
    ? "جهات اتصال العميل: " + (customerName ?? "العميل")
    : "جهات اتصال شركتك";

  return <section className="panel" style={{ marginTop: 16 }}>
    <div className="panel-head">
      <div>
        <h2><Users size={17} style={{ verticalAlign: "middle", marginInlineEnd: 7 }} />{title}</h2>
        <p>{mode === "admin"
          ? "إدارة دليل الاتصال المرتبط بملف العميل داخل المؤسسة."
          : "أضف مسؤولي المشتريات والمالية والاستلام. هذه سجلات اتصال تجارية وليست حسابات دخول أو صلاحيات مستخدمين."}</p>
      </div>
      <button type="button" className="btn outline" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> تحديث</button>
    </div>

    {error && <div className="error-box" role="alert" style={{ display: "block", margin: 14 }}>
      {error} <button type="button" className="btn outline" onClick={() => void load()} style={{ marginInlineStart: 8 }}>إعادة المحاولة</button>
    </div>}
    {notice && <div role="status" style={{ margin: 14, padding: 12, border: "1px solid #a8d7c0", borderRadius: 10, color: "#17684d" }}>{notice}</div>}

    <div style={{ padding: 16 }}>
      <form onSubmit={(event) => void submit(event)} style={{ border: "1px solid #e0ecee", borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{draft.id ? "تعديل جهة اتصال" : "إضافة جهة اتصال"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <label>الاسم الكامل
            <input style={inputStyle} value={draft.full_name} onChange={(e) => update("full_name", e.target.value)} maxLength={120} minLength={2} required />
          </label>
          <label>المسمى الوظيفي
            <input style={inputStyle} value={draft.job_title ?? ""} onChange={(e) => update("job_title", e.target.value)} maxLength={100} />
          </label>
          <label>الهاتف
            <input style={inputStyle} type="tel" dir="auto" value={draft.phone ?? ""} onChange={(e) => update("phone", e.target.value)} maxLength={32} />
          </label>
          <label>البريد الإلكتروني
            <input style={inputStyle} type="email" dir="ltr" value={draft.email ?? ""} onChange={(e) => update("email", e.target.value)} maxLength={254} />
          </label>
          <label>نوع جهة الاتصال
            <select style={inputStyle} value={draft.contact_type} onChange={(e) => update("contact_type", e.target.value as CustomerContactInput["contact_type"])}>
              {TYPE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
            <input type="checkbox" checked={draft.is_primary} onChange={(e) => update("is_primary", e.target.checked)} /> جهة الاتصال الرئيسية
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
            <input type="checkbox" checked={draft.is_active} onChange={(e) => update("is_active", e.target.checked)} /> نشطة
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn primary" type="submit" disabled={saving || loading || (mode === "admin" && !customerId)}>
            <Save size={15} />{saving ? "جارٍ الحفظ..." : draft.id ? "حفظ التغييرات" : "إضافة جهة الاتصال"}
          </button>
          {draft.id && <button type="button" className="btn outline" onClick={reset} disabled={saving}>إلغاء</button>}
        </div>
      </form>

      {loading ? <p role="status" style={{ padding: 16 }}>جارٍ تحميل جهات الاتصال...</p>
        : rows.length === 0 ? <div className="empty-state" style={{ textAlign: "center", padding: 24 }}><UserRound size={30} /><p>لا توجد جهات اتصال مسجلة بعد.</p></div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
          {rows.map((row) => <article key={row.id} style={{ border: "1px solid #dcebed", borderRadius: 12, padding: 14, opacity: row.is_active ? 1 : 0.65 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{row.full_name}</h3>
                <p style={{ margin: "4px 0", color: "#71868a" }}>{row.job_title || TYPE_OPTIONS.find((t) => t.value === row.contact_type)?.label}</p>
              </div>
              {row.is_primary && <span className="badge success"><CheckCircle2 size={13} /> رئيسية</span>}
            </div>
            {row.phone && <p style={{ margin: "8px 0 4px" }} dir="auto">{row.phone}</p>}
            {row.email && <p style={{ margin: "4px 0", overflowWrap: "anywhere" }}><Mail size={14} style={{ verticalAlign: "middle", marginInlineEnd: 5 }} />{row.email}</p>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap" }}>
              <span className={row.is_active ? "badge success" : "badge warning"}>{row.is_active ? "نشطة" : "غير نشطة"}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="btn outline" onClick={() => edit(row)} disabled={saving || Boolean(deletingId)}><Pencil size={14} /> تعديل</button>
                <button type="button" className="btn outline" onClick={() => void remove(row)} disabled={saving || Boolean(deletingId)}><Trash2 size={14} />{deletingId === row.id ? "جارٍ الحذف..." : "حذف"}</button>
              </div>
            </div>
          </article>)}
        </div>}
    </div>
  </section>;
}
