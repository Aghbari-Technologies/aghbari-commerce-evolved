import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/health")({
  head: () => ({
    meta: [
      { title: "فحوص صحة التشغيل | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ فحص صحة التشغيل...</main>}>
      <AdminOperationalScreen feature="health" />
    </ClientOnly>
  ),
});
