import { ClientOnly, createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AdminOperationalScreen } from "@/components/AdminOperationalScreens";

function AdminDevAiRouteContent() {
  const { pathname } = useLocation();

  // The index gets the dev-AI overview; nested routes render their own modules.
  return pathname === "/admin/dev-ai" || pathname === "/admin/dev-ai/"
    ? <AdminOperationalScreen feature="dev-ai" />
    : <Outlet />;
}

export const Route = createFileRoute("/admin_/dev-ai")({
  head: () => ({
    meta: [
      { title: "مركز تطوير الذكاء | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل مركز تطوير الذكاء...</main>}>
      <AdminDevAiRouteContent />
    </ClientOnly>
  ),
});
