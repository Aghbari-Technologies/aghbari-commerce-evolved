import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/images")({
  head: () => ({
    meta: [
      { title: "فهرس صور المنتجات | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل فهرس صور المنتجات...</main>}>
      <AdminOperationalScreen feature="images" />
    </ClientOnly>
  ),
});
