import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/queues")({
  head: () => ({
    meta: [
      { title: "طوابير العمليات الخلفية | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل الطوابير...</main>}>
      <AdminOperationalScreen feature="queues" />
    </ClientOnly>
  ),
});
