import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerInvoicesPage } from "@/components/CustomerWorkflows";

export const Route = createFileRoute("/financial-documents")({
  head: () => ({
    meta: [
      { title: "المستندات المالية | الأغبري" },
      { name: "description", content: "فواتير الحساب الحالي وفق صلاحيات الخدمة المالية." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل المستندات المالية...</main>}>
      <CustomerInvoicesPage />
    </ClientOnly>
  ),
});
