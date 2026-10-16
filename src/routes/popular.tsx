import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/popular")({
  head: () => ({ meta: [{ title: "الأكثر طلبًا | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ التحقق من بيانات الطلب...</main>}><CustomerDiscoveryPage mode="popular" /></ClientOnly>,
});
