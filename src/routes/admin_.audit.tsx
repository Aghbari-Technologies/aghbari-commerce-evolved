import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/audit")({
  head: () => ({
    meta: [
      { title: "سجل تدقيق الإدارة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل سجل التدقيق...</main>}>
      <AdminOperationalScreen feature="audit" />
    </ClientOnly>
  ),
});
