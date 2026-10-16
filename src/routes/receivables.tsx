import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerStatementPage } from "@/components/CustomerWorkflows";

export const Route = createFileRoute("/receivables")({
  head: () => ({
    meta: [
      { title: "الذمم المستحقة | الأغبري" },
      { name: "description", content: "أرصدة الفواتير والمدفوعات من كشف الحساب المخول للحساب الحالي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل الذمم المستحقة...</main>}>
      <CustomerStatementPage />
    </ClientOnly>
  ),
});
