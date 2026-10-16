import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/invites")({
  head: () => ({
    meta: [
      { title: "دعوات فريق الإدارة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل دعوات الفريق...</main>}>
      <AdminOperationalScreen feature="invites" />
    </ClientOnly>
  ),
});
