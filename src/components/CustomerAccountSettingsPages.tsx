import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Building2, Eye, Globe2, Laptop, LockKeyhole, Palette, RefreshCw, ShieldAlert, UserRound } from "lucide-react";
import { Login } from "@/components/Login";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type AccountPreference = "language" | "appearance";
type AccountUnavailableKind = "notifications" | "devices";
const shell: CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "28px 20px 64px", color: "var(--foreground, #183b3c)" };
const panel: CSSProperties = { border: "1px solid var(--border, #dce8e6)", borderRadius: 16, padding: 20, background: "var(--card, #fff)" };
const muted: CSSProperties = { color: "var(--muted-foreground, #637b7b)", lineHeight: 1.8 };
const field: CSSProperties = { width: "100%", minHeight: 42, padding: "9px 11px", border: "1px solid var(--border, #dce8e6)", borderRadius: 9, background: "var(--background, #fff)", color: "inherit" };
const primary: CSSProperties = { border: 0, borderRadius: 9, padding: "10px 15px", background: "#116b5b", color: "#fff", fontWeight: 700, cursor: "pointer" };

export function AccountSettingsHomePage() {
  const { user, ready } = useAuth();
  if (!ready) return <main dir="rtl" style={shell} role="status">جارٍ التحقق من الحساب...</main>;
  if (!user) return <Login />;
  const items = [
    { href: "/profile", title: "الملف الشخصي", detail: "عرض هوية الحساب الموثقة.", icon: UserRound },
    { href: "/company/details", title: "بيانات الشركة", detail: "عرض عضوية الشركة التي يعيدها الخادم.", icon: Building2 },
    { href: "/addresses", title: "عناوين التوصيل", detail: "إدارة عناوين التسليم المحفوظة.", icon: Laptop },
    { href: "/account/password", title: "كلمة المرور", detail: "تغيير كلمة مرور الجلسة الحالية.", icon: LockKeyhole },
    { href: "/account/notifications", title: "تفضيلات الإشعارات", detail: "حالة عقد تفضيلات الإشعارات.", icon: Bell },
    { href: "/account/language", title: "اللغة", detail: "إعداد لغة الواجهة المتاحة حاليًا.", icon: Globe2 },
    { href: "/account/appearance", title: "المظهر", detail: "تفضيل المظهر على هذا المتصفح.", icon: Palette },
    { href: "/account/devices", title: "الأجهزة والجلسات", detail: "حالة مصدر إدارة الأجهزة والجلسات.", icon: ShieldAlert },
  ];
  return <main dir="rtl" className="storefront" style={shell}>
    <header style={{ marginBottom: 20 }}><h1 style={{ margin: 0 }}>إعدادات الحساب</h1><p style={muted}>الحساب: <span dir="auto">{user.email}</span>. تظهر إجراءات الحساب المتاحة فقط؛ لا تُنشأ تفضيلات خادمية غير مدعومة.</p></header>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
      {items.map(({ href, title, detail, icon: Icon }) => <Link key={href} to={href as never} style={{ ...panel, color: "inherit", textDecoration: "none", display: "flex", gap: 12 }}>
        <Icon size={22} aria-hidden="true" /><span><strong>{title}</strong><span style={{ ...muted, display: "block", marginTop: 5 }}>{detail}</span></span>
      </Link>)}
    </div>
  </main>;
}

export function AccountPasswordPage() {
  const { user, ready } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setNotice("");
    if (password.length < 12) { setError("استخدم 12 حرفًا على الأقل لكلمة المرور الجديدة."); return; }
    if (password !== confirmation) { setError("تأكيد كلمة المرور لا يطابق القيمة الجديدة."); return; }
    setBusy(true);
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword(""); setConfirmation("");
      setNotice("أكدت خدمة المصادقة تحديث كلمة المرور.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث كلمة المرور؛ لم يتم تأكيد الحفظ.");
    } finally { setBusy(false); }
  }
  if (!ready) return <main dir="rtl" style={shell} role="status">جارٍ التحقق من الجلسة...</main>;
  if (!user) return <Login />;
  return <main dir="rtl" className="storefront" style={shell}>
    <h1>تغيير كلمة المرور</h1><p style={muted}>التغيير متاح للجلسة الموثقة عبر Supabase Auth. لا تُخزن كلمة المرور في قاعدة بيانات التطبيق أو السجل المحلي.</p>
    <form onSubmit={(event) => void submit(event)} style={{ ...panel, display: "grid", gap: 14, maxWidth: 620 }}>
      <label style={{ display: "grid", gap: 6 }}>كلمة المرور الجديدة<input style={field} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label style={{ display: "grid", gap: 6 }}>تأكيد كلمة المرور<input style={field} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button style={primary} disabled={busy} type="submit">{busy ? "جارٍ التحديث..." : "تحديث كلمة المرور"}</button>
    </form>
    <p style={{ marginTop: 16 }}><Link to="/account/settings">العودة إلى إعدادات الحساب</Link></p>
  </main>;
}

export function AccountPreferencePage({ preference }: { preference: AccountPreference }) {
  const { user, ready } = useAuth();
  const [selected, setSelected] = useState<string>(() => {
    if (typeof window === "undefined") return preference === "language" ? "ar" : "system";
    try { return window.localStorage.getItem(preference === "language" ? "aghbari:locale" : "aghbari:appearance") ?? (preference === "language" ? "ar" : "system"); } catch { return preference === "language" ? "ar" : "system"; }
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (preference !== "appearance" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = selected === "dark" || (selected === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.lang = "ar";
      document.documentElement.dir = "rtl";
    };
    apply();
    if (selected !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference, selected]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      if (typeof window === "undefined") throw new Error("لا تتوفر مساحة تخزين للمتصفح.");
      window.localStorage.setItem(preference === "language" ? "aghbari:locale" : "aghbari:appearance", selected);
      document.documentElement.lang = "ar"; document.documentElement.dir = "rtl";
      if (preference === "appearance") document.documentElement.classList.toggle("dark", selected === "dark" || (selected === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
      setNotice(preference === "language" ? "حُفظ تفضيل العربية على هذا المتصفح. الإنجليزية غير متاحة لأن تعريب جميع الشاشات الإنجليزية غير مكتمل." : "حُفظ تفضيل المظهر وطُبق على هذا المتصفح فقط.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ التفضيل."); }
  }
  if (!ready) return <main dir="rtl" style={shell} role="status">جارٍ التحقق من الجلسة...</main>;
  if (!user) return <Login />;
  const language = preference === "language";
  return <main dir="rtl" className="storefront" style={shell}>
    <h1>{language ? "لغة الواجهة" : "مظهر الواجهة"}</h1>
    <p style={muted}>{language ? "التفضيل محلي للمتصفح. الواجهة المدعومة حاليًا عربية RTL؛ خيار الإنجليزية معطل حتى تكتمل ترجمات جميع الشاشات." : "يمكن تطبيق فاتح أو داكن أو اتباع إعداد الجهاز. هذا التفضيل محلي، ولا يغيّر إعدادات المؤسسة لدى الخادم."}</p>
    <form onSubmit={(event) => void save(event)} style={{ ...panel, maxWidth: 620, display: "grid", gap: 14 }}>
      {language
        ? <label style={{ display: "grid", gap: 6 }}>اللغة<select style={field} value={selected} onChange={(event) => setSelected(event.target.value)}><option value="ar">العربية (RTL)</option><option value="en" disabled>English — غير مهيأة بالكامل</option></select></label>
        : <label style={{ display: "grid", gap: 6 }}>المظهر<select style={field} value={selected} onChange={(event) => setSelected(event.target.value)}><option value="system">حسب إعداد الجهاز</option><option value="light">فاتح</option><option value="dark">داكن</option></select></label>}
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <button type="submit" style={primary}>حفظ التفضيل</button>
    </form>
    <p style={{ marginTop: 16 }}><Link to="/account/settings">العودة إلى إعدادات الحساب</Link></p>
  </main>;
}

export function AccountUnavailablePage({ kind }: { kind: AccountUnavailableKind }) {
  const { user, ready } = useAuth();
  if (!ready) return <main dir="rtl" style={shell} role="status">جارٍ التحقق من الجلسة...</main>;
  if (!user) return <Login />;
  const notifications = kind === "notifications";
  return <main dir="rtl" className="storefront" style={shell}>
    <section style={{ ...panel, maxWidth: 800 }} role="status">
      <ShieldAlert size={28} aria-hidden="true" />
      <p style={{ fontWeight: 800, color: "#9a6700" }}>BLOCKED / NOT CONFIGURED</p>
      <h1>{notifications ? "تفضيلات الإشعارات" : "الأجهزة والجلسات"}</h1>
      <p style={muted}>{notifications
        ? "لم يُتحقق من عقد خادمي يقرأ ويكتب تفضيلات إشعارات العميل ضمن نطاق المؤسسة الحالية. لا يتم حفظ مفاتيح محلية أو الإبلاغ عن تغيير غير مؤكد."
        : "لا تتوفر في خدمة الحساب الحالية واجهة موثقة لقائمة أجهزة العميل أو إبطال جلسة جهاز. لن نعرض بيانات مصطنعة أو زر إبطال شكلي."}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}><Link to="/account/settings">إعدادات الحساب</Link><Link to="/help/account">مساعدة الحساب</Link></div>
    </section>
  </main>;
}

export function CustomerNotificationsPage() {
  return <AccountUnavailablePage kind="notifications" />;
}
