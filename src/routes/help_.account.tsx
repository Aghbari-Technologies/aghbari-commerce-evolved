import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerHelpPage } from "@/components/CustomerHelpPages";
export const Route = createFileRoute("/help_/account")({
  head: () => ({ meta: [{ title: "مساعدة الحساب | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل إرشادات الحساب...</main>}><CustomerHelpPage topic="account" /></ClientOnly>,
});
