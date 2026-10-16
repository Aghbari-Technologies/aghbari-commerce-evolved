import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/models")({
  head: () => ({
    meta: [
      { title: "سجل نماذج الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل سجل النماذج...</main>}>
      <AdminOperationalScreen feature="ai-models" />
    </ClientOnly>
  ),
});
