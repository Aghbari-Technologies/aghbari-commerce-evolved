import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { ReorderWorkspacePage } from "@/components/CustomerWorkflows";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "قوالب الشراء | الأغبري" },
      { name: "description", content: "إدارة قوالب إعادة الطلب المحفوظة من بيانات الشراء الفعلية." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل قوالب الشراء...</div>}>
      <ReorderWorkspacePage />
    </ClientOnly>
  ),
});
