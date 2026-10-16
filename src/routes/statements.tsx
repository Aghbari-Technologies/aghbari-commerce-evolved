import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerStatementPage } from "@/components/CustomerWorkflows";

export const Route = createFileRoute("/statements")({
  head: () => ({
    meta: [
      { title: "كشوف الحساب | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل كشوف الحساب...</div>}>
      <CustomerStatementPage />
    </ClientOnly>
  ),
});
