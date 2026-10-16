import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountUnavailablePage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/account/devices")({
  head: () => ({ meta: [{ title: "الأجهزة والجلسات | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل الأجهزة...</main>}><AccountUnavailablePage kind="devices" /></ClientOnly>,
});
