import { createFileRoute, ClientOnly, Outlet, useLocation } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";

function AdminAiRouteContent() {
  const { pathname } = useLocation();

  // This route is also the parent for /admin/ai/* file routes. Keep the AI
  // center at its index URL, but let every nested operational route render.
  return pathname === "/admin/ai" || pathname === "/admin/ai/"
    ? <AdminApp initialView="ai" />
    : <Outlet />;
}

export const Route = createFileRoute("/admin_/ai")({
  head: () => ({ meta: [{ title: "مركز الذكاء | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={null}><AdminAiRouteContent /></ClientOnly>,
});
