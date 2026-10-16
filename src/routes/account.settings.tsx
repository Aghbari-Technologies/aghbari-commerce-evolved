import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountSettingsHomePage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/account/settings")({
  head: () => ({ meta: [{ title: "إعدادات الحساب | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل إعدادات الحساب...</main>}><AccountSettingsHomePage /></ClientOnly>,
});
