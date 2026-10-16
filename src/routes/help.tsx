import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerHelpPage } from "@/components/CustomerHelpPages";
export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "مركز المساعدة | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل المساعدة...</main>}><CustomerHelpPage topic="overview" /></ClientOnly>,
});
