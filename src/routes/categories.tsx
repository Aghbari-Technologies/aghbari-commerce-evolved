import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "تصنيفات المنتجات | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل التصنيفات...</main>}><CustomerDiscoveryPage mode="categories" /></ClientOnly>,
});
