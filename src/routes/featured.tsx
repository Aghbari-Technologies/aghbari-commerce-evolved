import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/featured")({
  head: () => ({ meta: [{ title: "المنتجات المميزة | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ التحقق من المنتجات المميزة...</main>}><CustomerDiscoveryPage mode="featured" /></ClientOnly>,
});
