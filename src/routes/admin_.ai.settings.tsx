import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الذكاء الاصطناعي | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل إعدادات الذكاء...</main>}>
      <AdminOperationalScreen feature="ai-settings" />
    </ClientOnly>
  ),
});
