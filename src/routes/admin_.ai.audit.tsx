import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/audit")({
  head: () => ({
    meta: [
      { title: "دفتر استخدام الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل دفتر الاستخدام...</main>}>
      <AdminOperationalScreen feature="ai-audit" />
    </ClientOnly>
  ),
});
