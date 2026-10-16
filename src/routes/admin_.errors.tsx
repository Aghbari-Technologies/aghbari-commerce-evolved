import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/errors")({
  head: () => ({
    meta: [
      { title: "إخفاقات العمليات | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل الإخفاقات...</main>}>
      <AdminOperationalScreen feature="errors" />
    </ClientOnly>
  ),
});
