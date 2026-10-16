import { useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CircleHelp, Mail, PackageCheck, ShieldAlert, UserRound } from "lucide-react";
import { fetchSettingsMap } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

export type CustomerHelpTopic = "overview" | "faq" | "order" | "account" | "policies";
const shell: CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "28px 20px 64px", color: "var(--foreground, #183b3c)" };
const panel: CSSProperties = { border: "1px solid var(--border, #dce8e6)", borderRadius: 16, padding: 20, background: "var(--card, #fff)" };
const muted: CSSProperties = { color: "var(--muted-foreground, #637b7b)", lineHeight: 1.9 };
const field: CSSProperties = { width: "100%", minHeight: 42, padding: "9px 11px", border: "1px solid var(--border, #dce8e6)", borderRadius: 9, background: "var(--background, #fff)", color: "inherit" };

export function CustomerHelpPage({ topic }: { topic: CustomerHelpTopic }) {
  const title = topic === "overview" ? "مركز المساعدة"
    : topic === "faq" ? "الأسئلة الشائعة"
    : topic === "order" ? "مساعدة الطلبات"
    : topic === "account" ? "مساعدة الحساب"
    : "السياسات";
  return <main dir="rtl" className="storefront" style={shell}>
    <header style={{ marginBottom: 20 }}><p style={{ ...muted, margin: "0 0 4px" }}>الأغبري · إرشادات الاستخدام</p><h1 style={{ margin: 0, fontSize: 30 }}>{title}</h1></header>
    {topic === "overview" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
      <HelpLink to="/help/faq" title="الأسئلة الشائعة" detail="إجابات حول السعر والمخزون والطلب." icon={CircleHelp} />
      <HelpLink to="/help/order" title="الطلبات" detail="مراجعة الطلب ومتابعة حالته من المصدر." icon={PackageCheck} />
      <HelpLink to="/help/account" title="الحساب والشركة" detail="الدخول والملف والعناوين والأعضاء." icon={UserRound} />
      <HelpLink to="/help/contact" title="التواصل" detail="إنشاء رسالة بريد إلى العنوان المنشور إن توفر." icon={Mail} />
      <HelpLink to="/help/policies" title="السياسات" detail="حالة نشر وثيقة السياسات العامة." icon={BookOpen} />
    </div>}
    {topic === "faq" && <section style={{ display: "grid", gap: 12 }}>
      {[
        ["كيف أعرف السعر الصحيح؟", "تعرض صفحة المنتج السعر الذي أعادته خدمة التسعير للحساب الحالي. إذا تعذر إثبات سعر موثوق، تخفي الواجهة السعر بدل تقديره."],
        ["لماذا لا يظهر منتج في السلة؟", "السلة تُراجع مقابل كتالوج الخادم. الأصناف غير المحلولة تمنع إرسال طلب جزئي؛ حدّث الكتالوج ثم راجع السلة."],
        ["هل إنشاء الطلب يعني اعتماده؟", "لا. إنشاء الطلب، ومراجعة الكميات والأسعار، وتأكيده حالات منفصلة. اتبع الحالة الظاهرة في سجل الطلبات."],
        ["أين أرى الفواتير والمدفوعات؟", "تظهر الفواتير وكشف الحساب وفق العقد المالي وصلاحيات المؤسسة؛ لا تنشئ الواجهة بيانات مالية غير موجودة."],
      ].map(([q,a]) => <details key={q} style={panel}><summary style={{ fontWeight: 800, cursor: "pointer" }}>{q}</summary><p style={muted}>{a}</p></details>)}
    </section>}
    {topic === "order" && <section style={panel}>
      <h2 style={{ marginTop: 0 }}>مراجعة الطلب وتتبع الحالة</h2>
      <ol style={{ lineHeight: 2.1 }}><li>أضف الأصناف المتاحة إلى السلة مع الكميات المطلوبة.</li><li>راجع السلة والعنوان والكميات قبل الإرسال.</li><li>اقرأ رسالة الخادم وحالة الطلب؛ لا تعتبر الطلب معتمدًا حتى تؤكد الحالة ذلك.</li><li>تابع الحالة في سجل الطلبات، وافتح التفاصيل عند الحاجة إلى تعديل أو إيضاح.</li></ol>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}><Link to="/cart">فتح السلة</Link><Link to="/checkout/review">مراجعة الطلب</Link><Link to="/orders">طلباتي</Link></div>
    </section>}
    {topic === "account" && <section style={panel}>
      <h2 style={{ marginTop: 0 }}>بيانات الحساب التجاري</h2>
      <p style={muted}>أكمل بيانات الهوية والشركة وعناوين التسليم من الشاشات المخصصة. صلاحيات الشركة والأعضاء تظل محكومة بعقود الخادم، وأي حقل لا يملك مسار كتابة موثقًا يعرض للقراءة فقط.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}><Link to="/profile">الملف الشخصي</Link><Link to="/company">بيانات الشركة</Link><Link to="/company/users">الأعضاء</Link><Link to="/addresses">عناوين التوصيل</Link><Link to="/account/password">تغيير كلمة المرور</Link></div>
    </section>}
    {topic === "policies" && <section style={panel} role="status">
      <ShieldAlert size={28} aria-hidden="true" /><p style={{ fontWeight: 800, color: "#9a6700" }}>NOT CONFIGURED</p><h2>وثيقة السياسات العامة غير منشورة</h2>
      <p style={muted}>لم يتم العثور على مستند سياسة قانونية معتمد في عقد إعدادات العرض العام الحالي. لن تعرض هذه الصفحة شروطًا قانونية أو وعودًا مستحدثة نيابةً عن إدارة المتجر.</p>
      <Link to="/help/contact">تواصل مع إدارة المتجر</Link>
    </section>}
    {topic !== "overview" && <p style={{ marginTop: 18 }}><Link to="/help">العودة إلى مركز المساعدة</Link></p>}
  </main>;
}

function HelpLink({ to, title, detail, icon: Icon }: { to: string; title: string; detail: string; icon: typeof BookOpen }) {
  return <Link to={to as never} style={{ display: "flex", gap: 12, border: "1px solid var(--border, #dce8e6)", borderRadius: 16, padding: 18, color: "inherit", textDecoration: "none", background: "var(--card, #fff)" }}>
    <Icon size={22} aria-hidden="true" /><span><strong>{title}</strong><span style={{ display: "block", color: "var(--muted-foreground, #637b7b)", lineHeight: 1.8, marginTop: 6 }}>{detail}</span></span>
  </Link>;
}

export function CustomerHelpContactPage() {
  const { data: settings, loading, error, refetch } = useFetch(fetchSettingsMap);
  const [name, setName] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [message, setMessage] = useState("");
  const [mailHref, setMailHref] = useState("");
  const [formError, setFormError] = useState("");
  const email = typeof settings?.store_email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.store_email) ? settings.store_email.trim() : "";
  function submit(event: FormEvent) {
    event.preventDefault(); setFormError(""); setMailHref("");
    if (name.trim().length < 2 || message.trim().length < 10) { setFormError("أدخل الاسم ورسالة لا تقل عن 10 أحرف."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail.trim())) { setFormError("أدخل بريدًا إلكترونيًا صحيحًا للرد."); return; }
    if (!email) { setFormError("لم ينشر الخادم بريد تواصل صالحًا. لم تُنشأ تذكرة ولم تُرسل رسالة."); return; }
    const subject = encodeURIComponent("رسالة دعم من متجر الأغبري");
    const body = encodeURIComponent("الاسم: " + name.trim() + "\nبريد الرد: " + replyEmail.trim() + "\n\n" + message.trim());
    setMailHref("mailto:" + email + "?subject=" + subject + "&body=" + body);
  }
  return <main dir="rtl" className="storefront" style={shell}>
    <h1>التواصل مع إدارة المتجر</h1><p style={muted}>تستخدم هذه الشاشة البريد المنشور في إعدادات العرض العام. فتح تطبيق البريد لا يعني أن الرسالة أُرسلت أو أن تذكرة سُجلت.</p>
    {loading && <p role="status">جارٍ تحميل بيانات التواصل...</p>}
    {error && <div style={panel} role="alert">تعذر التحقق من بريد التواصل: {error.message} <button type="button" onClick={() => void refetch()}>إعادة المحاولة</button></div>}
    {!loading && !error && !email && <div style={panel} role="status">بريد التواصل غير مهيأ في الإعدادات العامة؛ لم يتم عرض عنوان غير موثق.</div>}
    <form onSubmit={submit} style={{ ...panel, display: "grid", gap: 12, maxWidth: 720 }}>
      <label style={{ display: "grid", gap: 6 }}>الاسم<input style={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required /></label>
      <label style={{ display: "grid", gap: 6 }}>بريد الرد<input style={field} type="email" autoComplete="email" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} maxLength={254} required /></label>
      <label style={{ display: "grid", gap: 6 }}>الرسالة<textarea style={{ ...field, minHeight: 150 }} value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={4000} required /></label>
      {formError && <p role="alert">{formError}</p>}
      <button type="submit" disabled={loading || Boolean(error) || !email} style={{ border: 0, borderRadius: 9, padding: "10px 15px", background: "#116b5b", color: "#fff", fontWeight: 700 }}>التحقق وتجهيز الرسالة</button>
      {mailHref && <p role="status">جهّزت الرسالة. اضغط الرابط لفتح تطبيق البريد لإرسالها يدويًا: <a href={mailHref}>فتح البريد إلى {email}</a></p>}
    </form>
  </main>;
}
