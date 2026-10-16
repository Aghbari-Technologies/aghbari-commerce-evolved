import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/dev-ai")({
  head: () => ({
    meta: [
      { title: "مركز تطوير الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل مركز تطوير الذكاء...</main>}>
      <AdminOperationalScreen feature="dev-ai" />
    </ClientOnly>
  ),
});
