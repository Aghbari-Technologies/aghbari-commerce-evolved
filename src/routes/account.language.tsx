import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountPreferencePage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/account/language")({
  head: () => ({ meta: [{ title: "لغة الواجهة | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل إعداد اللغة...</main>}><AccountPreferencePage preference="language" /></ClientOnly>,
});
