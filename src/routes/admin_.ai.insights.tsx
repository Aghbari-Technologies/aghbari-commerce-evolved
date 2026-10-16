import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/insights")({
  head: () => ({
    meta: [
      { title: "رؤى وتوصيات الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل الرؤى...</main>}>
      <AdminOperationalScreen feature="ai-insights" />
    </ClientOnly>
  ),
});
