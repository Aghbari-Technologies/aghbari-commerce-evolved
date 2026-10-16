import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerNotificationsPage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "إشعارات الحساب | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل الإشعارات...</main>}><CustomerNotificationsPage /></ClientOnly>,
});
