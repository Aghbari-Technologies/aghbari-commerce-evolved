import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountUnavailablePage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/account/notifications")({
  head: () => ({ meta: [{ title: "تفضيلات الإشعارات | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل التفضيلات...</main>}><AccountUnavailablePage kind="notifications" /></ClientOnly>,
});
