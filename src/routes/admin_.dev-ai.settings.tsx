import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/dev-ai/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات تطوير الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل إعدادات التطوير...</main>}>
      <AdminOperationalScreen feature="dev-ai-settings" />
    </ClientOnly>
  ),
});
