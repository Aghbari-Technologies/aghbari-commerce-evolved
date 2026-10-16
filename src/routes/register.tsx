import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Login } from "@/components/Login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب تجاري | الأغبري" },
      { name: "description", content: "أنشئ حسابك التجاري لطلب منتجات الجملة ومتابعة طلباتك في الأغبري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<div className="login-screen" dir="rtl" role="status">جار تحميل صفحة إنشاء الحساب...</div>}>
      <Login initialMode="register" onDone={() => void navigate({ to: "/" })} />
    </ClientOnly>
  );
}
