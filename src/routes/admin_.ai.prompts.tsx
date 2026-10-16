import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/prompts")({
  head: () => ({
    meta: [
      { title: "مكتبة أوامر الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل مكتبة الأوامر...</main>}>
      <AdminOperationalScreen feature="ai-prompts" />
    </ClientOnly>
  ),
});
