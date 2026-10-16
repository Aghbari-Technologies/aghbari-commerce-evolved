import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/collections")({
  head: () => ({ meta: [{ title: "مجموعات التصفح | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل مجموعات التصفح...</main>}><CustomerDiscoveryPage mode="collections" /></ClientOnly>,
});
