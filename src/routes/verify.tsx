import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

type VerificationStatus = "checking" | "waiting" | "verified" | "invalid";

function hasVerificationCallback(url: URL): boolean {
  const queryType = url.searchParams.get("type");
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const fragmentType = fragment.get("type");

  return url.searchParams.has("code") ||
    (url.searchParams.has("token_hash") && ["signup", "email", "email_change"].includes(queryType ?? "")) ||
    (["signup", "email_change"].includes(fragmentType ?? "") && fragment.has("access_token"));
}

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "تأكيد البريد الإلكتروني | الأغبري" },
      { name: "description", content: "تحقق من رابط تأكيد البريد الإلكتروني لحسابك في الأغبري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

export function VerifyPage() {
  const [status, setStatus] = useState<VerificationStatus>("checking");

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;
    const url = new URL(window.location.href);

    if (url.searchParams.has("error") || url.searchParams.has("error_description")) {
      setStatus("invalid");
      return () => { active = false; };
    }

    if (!hasVerificationCallback(url)) {
      setStatus("waiting");
      return () => { active = false; };
    }

    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (active && session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
          setStatus("verified");
        }
      });
      subscription = data.subscription;

      void supabase.auth.getSession().then(({ data: sessionData, error }) => {
        if (!active) return;
        setStatus(!error && sessionData.session ? "verified" : "invalid");
      }).catch(() => {
        if (active) setStatus("invalid");
      });
    } catch {
      setStatus("invalid");
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <main className="login-screen" dir="rtl">
      <section className="login-right" style={{ margin: "auto" }} aria-live="polite">
        {status === "checking" && (
          <div className="login-form" role="status">
            <h1>جارٍ التحقق من رابط البريد الإلكتروني</h1>
            <p>نتحقق من صلاحية رابط التأكيد والجلسة الآمنة...</p>
          </div>
        )}
        {status === "waiting" && (
          <div className="login-form">
            <h1>تأكيد البريد الإلكتروني</h1>
            <p>افتح رابط التأكيد الذي أرسلناه إلى بريدك الإلكتروني. ستعرض هذه الصفحة النتيجة بعد معالجة الرابط.</p>
            <nav className="login-hint" aria-label="التنقل">
              <a className="sf-link" href="/register">العودة إلى إنشاء الحساب</a>
              <a className="sf-link" href="/login">تسجيل الدخول</a>
            </nav>
          </div>
        )}
        {status === "verified" && (
          <div className="login-form">
            <h1>تم تأكيد البريد الإلكتروني</h1>
            <p role="status">تمت معالجة رابط التأكيد وصارت الجلسة متاحة. يمكنك المتابعة إلى المتجر.</p>
            <a className="login-submit" href="/">المتابعة إلى متجر الأغبري</a>
          </div>
        )}
        {status === "invalid" && (
          <div className="login-form">
            <h1>تعذر تأكيد البريد الإلكتروني</h1>
            <p className="login-error" role="alert">رابط التأكيد غير صالح أو انتهت صلاحيته، أو تعذر الاتصال بخدمة الحساب. افتح أحدث رابط من بريدك أو سجّل الدخول للتحقق من حالة حسابك.</p>
            <nav className="login-hint" aria-label="التنقل">
              <a className="sf-link" href="/login">تسجيل الدخول</a>
              <a className="sf-link" href="/register">إنشاء حساب جديد</a>
            </nav>
          </div>
        )}
      </section>
    </main>
  );
}
