import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Login } from "@/components/Login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور | الأغبري" },
      { name: "description", content: "اطلب رابطاً آمناً لإعادة تعيين كلمة مرور حسابك في الأغبري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <ClientOnly fallback={<div className="login-screen" dir="rtl" role="status">جار تحميل صفحة استعادة كلمة المرور...</div>}>
      <Login initialMode="forgot" />
    </ClientOnly>
  );
}
