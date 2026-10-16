import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة | الأغبري" },
      { name: "description", content: "أعد تعيين كلمة مرور حسابك في الأغبري." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة | الأغبري" },
      { property: "og:description", content: "أعد تعيين كلمة مرور حسابك." },
    ],
  }),
  component: ResetPasswordPage,
});

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    if (password.length < 8) { setMsg("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    if (password !== confirmPassword) { setMsg("تأكيد كلمة المرور غير مطابق"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMsg("انتهت صلاحية الرابط أو حدث خطأ. اطلب رابطاً جديداً."); return; }
      void navigate({ to: "/" });
    } catch {
      setMsg("تعذر تحديث كلمة المرور بسبب مشكلة في الاتصال. تحقق من الاتصال ثم حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen" dir="rtl"><div className="login-right" style={{ margin: "auto" }}>
      <form className="login-form" onSubmit={submit} noValidate>
        <h1>تعيين كلمة مرور جديدة</h1>
        <label className="login-field"><span>كلمة المرور الجديدة</span><div className="login-input-wrap"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required /></div></label>
        <label className="login-field"><span>تأكيد كلمة المرور الجديدة</span><div className="login-input-wrap"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required /></div></label>
        {msg && <div className="login-error" role="alert">{msg}</div>}
        <button className="login-submit" type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ"}</button>
      </form>
    </div></div>
  );
}
