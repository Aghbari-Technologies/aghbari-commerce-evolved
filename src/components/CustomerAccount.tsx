import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, LogOut, RefreshCw, UserRound } from "lucide-react";
import { Login } from "@/components/Login";
import { useAuth } from "@/lib/auth";
import {
  fetchCompanyMembershipWorkspace,
  type CompanyMembershipWorkspace,
} from "@/lib/customer-company-members";

const shell: CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: 24,
  color: "#183b3c",
};

const panel: CSSProperties = {
  border: "1px solid #d9e7e4",
  borderRadius: 16,
  background: "#fff",
  padding: 20,
};

const primaryButton: CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: "10px 14px",
  background: "#116b5b",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

export function CustomerProfilePage() {
  const { user, ready, configurationError, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      await signOut();
      await navigate({ to: "/login", replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنهاء الجلسة.");
    } finally {
      setSigningOut(false);
    }
  }

  if (!ready) {
    return <main dir="rtl" className="storefront" style={shell} role="status">جارٍ التحقق من جلسة الحساب...</main>;
  }
  if (!user) return <Login />;

  return (
    <main dir="rtl" className="storefront" style={shell}>
      <header style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20 }}>
        <UserRound aria-hidden="true" size={28} />
        <div>
          <h1 style={{ margin: 0 }}>ملفي الشخصي</h1>
          <p style={{ margin: "4px 0 0", color: "#527071" }}>بيانات الهوية المرتبطة بالجلسة الموثقة.</p>
        </div>
      </header>
      {configurationError && <p role="alert">{configurationError}</p>}
      {error && <p role="alert">{error}</p>}
      <section style={panel} aria-labelledby="profile-details-heading">
        <h2 id="profile-details-heading" style={{ marginTop: 0 }}>بيانات الحساب</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          <div><dt style={{ color: "#527071" }}>الاسم المسجل</dt><dd style={{ margin: "4px 0 0", fontWeight: 700 }}>{user.name || "غير مسجل"}</dd></div>
          <div><dt style={{ color: "#527071" }}>البريد الإلكتروني</dt><dd dir="auto" style={{ margin: "4px 0 0", overflowWrap: "anywhere", fontWeight: 700 }}>{user.email}</dd></div>
        </dl>
        <p style={{ lineHeight: 1.8, color: "#527071" }}>
          يعرض هذا القسم بيانات الهوية التي أكدتها خدمة الحساب. تعديل بيانات الملف غير متاح هنا لأن عقد تحديث الملف الشخصي المستقل غير مهيأ؛ لم تُحفظ أي تغييرات غير مؤكدة.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link to="/company/details">بيانات الشركة</Link>
          <Link to="/addresses">عناوين التوصيل</Link>
          <Link to="/company/contacts">جهات الاتصال</Link>
          <Link to="/company/users">أعضاء الشركة</Link>
        </div>
        <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} style={{ ...primaryButton, marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <LogOut size={16} aria-hidden="true" />{signingOut ? "جارٍ إنهاء الجلسة..." : "تسجيل الخروج"}
        </button>
      </section>
    </main>
  );
}

export function CompanyDetailsPage() {
  const { user, ready } = useAuth();
  const [workspace, setWorkspace] = useState<CompanyMembershipWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchCompanyMembershipWorkspace();
      setWorkspace(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل بيانات الشركة من الخادم.");
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user && !user.isStaff) void load();
    else if (ready) setLoading(false);
  }, [ready, user, load]);

  if (!ready) return <main dir="rtl" className="storefront" style={shell} role="status">جارٍ التحقق من صلاحية الحساب...</main>;
  if (!user) return <Login />;
  if (user.isStaff) {
    return <main dir="rtl" className="storefront" style={shell} role="alert"><h1>بيانات الشركة</h1><p>هذه شاشة مساحة العميل وليست بديلاً عن أدوات إدارة المؤسسات.</p><Link to="/admin">العودة إلى لوحة الإدارة</Link></main>;
  }

  return (
    <main dir="rtl" className="storefront" style={shell}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div><h1 style={{ margin: 0 }}>بيانات الشركة</h1><p style={{ color: "#527071", marginBottom: 0 }}>المؤسسة الحالية مأخوذة من خدمة عضوية الشركة الخاضعة لصلاحيات الخادم.</p></div>
        <button type="button" style={{ ...primaryButton, display: "inline-flex", alignItems: "center", gap: 8 }} disabled={loading} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />تحديث البيانات</button>
      </header>
      {loading && <p role="status">جارٍ تحميل بيانات الشركة من الخادم...</p>}
      {error && <section style={panel} role="alert"><h2>تعذر تحميل البيانات</h2><p>{error}</p><button type="button" style={primaryButton} disabled={loading} onClick={() => void load()}>إعادة المحاولة</button></section>}
      {!loading && !error && workspace && (
        <>
          <section style={panel} aria-labelledby="company-summary-heading">
            <Building2 size={25} aria-hidden="true" />
            <h2 id="company-summary-heading">{workspace.company_name}</h2>
            <p>اسم الشركة كما أعادته خدمة العضويات. هذه الشاشة للعرض؛ لا تعرض نموذج تعديل لأن عقد تعديل بيانات الشركة غير متاح في طبقة الخدمة الحالية.</p>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
              <div><dt>الأعضاء المعادون من الخادم</dt><dd style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}>{workspace.members.length}</dd></div>
              <div><dt>الدعوات المعادة من الخادم</dt><dd style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}>{workspace.invitations.length}</dd></div>
            </dl>
          </section>
          <nav aria-label="إدارة مساحة الشركة" style={{ ...panel, display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
            <Link to="/company/users">الأعضاء والدعوات</Link>
            <Link to="/company/contacts">جهات الاتصال</Link>
            <Link to="/addresses">عناوين التوصيل</Link>
            <Link to="/invoices">الفواتير</Link>
            <Link to="/statements">كشوف الحساب</Link>
          </nav>
        </>
      )}
    </main>
  );
}

export function AccountApprovalStatusPage() {
  const { user, ready } = useAuth();
  if (!ready) return <main dir="rtl" className="storefront" style={shell} role="status">جارٍ التحقق من الحساب...</main>;
  if (!user) return <Login />;
  return (
    <main dir="rtl" className="storefront" style={shell}>
      <section style={panel}>
        <h1>حالة اعتماد الحساب</h1>
        <p role="status">لا توفر خدمة الحساب الحالية حالة اعتماد إدارية موثقة لهذا المستخدم. لذلك لا يمكن تصنيف الحساب على أنه معتمد أو معلّق دون استجابة خادمية صريحة.</p>
        <p>لم تتغير صلاحيات الحساب نتيجة فتح هذه الشاشة. إذا كان الوصول إلى الطلبات مرفوضًا، أعد المحاولة لاحقًا أو تواصل مع مسؤول حساب شركتك.</p>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Link to="/profile">ملفي الشخصي</Link>
          <Link to="/">المتجر</Link>
          <Link to="/company/users">إدارة أعضاء الشركة</Link>
        </nav>
      </section>
    </main>
  );
}
