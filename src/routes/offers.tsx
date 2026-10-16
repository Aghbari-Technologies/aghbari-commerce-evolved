import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/offers")({
  head: () => ({ meta: [{ title: "العروض الحالية | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل العروض...</main>}><CustomerDiscoveryPage mode="offers" /></ClientOnly>,
});
