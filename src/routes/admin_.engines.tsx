import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/engines")({
  head: () => ({
    meta: [
      { title: "محركات الذكاء المهيأة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل محركات الذكاء...</main>}>
      <AdminOperationalScreen feature="engines" />
    </ClientOnly>
  ),
});
