import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminUserRolesEntry } from "@/components/AdminOperationalScreens";

export const Route = createFileRoute("/admin_/users")({
  head: () => ({
    meta: [
      { title: "مستخدمو الإدارة والصلاحيات | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ التحقق من صلاحيات المستخدمين...</main>}>
      <AdminUserRolesEntry />
    </ClientOnly>
  ),
});
