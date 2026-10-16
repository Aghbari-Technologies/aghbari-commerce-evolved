import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";

export const Route = createFileRoute("/admin_/appearance")({
  head: () => ({
    meta: [
      { title: "مظهر لوحة الإدارة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main className="storefront" dir="rtl" role="status">جارٍ تحميل إعدادات المظهر...</main>}>
      <AdminApp initialView="settings" initialSettingsTab="appearance" />
    </ClientOnly>
  ),
});
