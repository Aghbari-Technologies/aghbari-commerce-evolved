import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/dev-ai/audit")({
  head: () => ({
    meta: [
      { title: "تدقيق تطوير الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل تدقيق التطوير...</main>}>
      <AdminOperationalScreen feature="dev-ai-audit" />
    </ClientOnly>
  ),
});
