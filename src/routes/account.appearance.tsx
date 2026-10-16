import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountPreferencePage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/account/appearance")({
  head: () => ({ meta: [{ title: "مظهر الواجهة | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل تفضيل المظهر...</main>}><AccountPreferencePage preference="appearance" /></ClientOnly>,
});
