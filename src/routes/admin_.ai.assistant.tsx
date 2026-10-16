import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/assistant")({
  head: () => ({
    meta: [
      { title: "مساعد الإدارة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل مساعد الإدارة...</main>}>
      <AdminOperationalScreen feature="ai-assistant" />
    </ClientOnly>
  ),
});
