import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/ai/governance")({
  head: () => ({
    meta: [
      { title: "حوكمة الذكاء الاصطناعي | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل حوكمة الذكاء...</main>}>
      <AdminOperationalScreen feature="ai-governance" />
    </ClientOnly>
  ),
});
