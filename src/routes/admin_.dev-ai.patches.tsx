import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/dev-ai/patches")({
  head: () => ({
    meta: [
      { title: "ترقيعات التطوير | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل ترقيعات التطوير...</main>}>
      <AdminOperationalScreen feature="dev-ai-patches" />
    </ClientOnly>
  ),
});
