import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/restore")({
  head: () => ({
    meta: [
      { title: "النسخ الاحتياطي والاستعادة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل حالة النسخ والاستعادة...</main>}>
      <AdminOperationalScreen feature="restore" />
    </ClientOnly>
  ),
});
