import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/architecture")({
  head: () => ({
    meta: [
      { title: "مرجع بنية التطبيق | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل مرجع البنية...</main>}>
      <AdminOperationalScreen feature="architecture" />
    </ClientOnly>
  ),
});
