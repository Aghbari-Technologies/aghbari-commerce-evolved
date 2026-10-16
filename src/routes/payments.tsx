import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerStatementPage } from "@/components/CustomerWorkflows";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "المدفوعات | الأغبري" },
      { name: "description", content: "حركات الدفعات المرتبطة بكشف الحساب الصادر من الخدمة المالية." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل حركات الدفعات...</main>}>
      <CustomerStatementPage />
    </ClientOnly>
  ),
});
