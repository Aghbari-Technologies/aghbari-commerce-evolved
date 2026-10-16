import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/collection/$slug")({
  head: () => ({ meta: [{ title: "مجموعة المنتجات | الأغبري" }] }),
  component: function CollectionPage() {
    const { slug } = Route.useParams();
    return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل المجموعة...</main>}><CustomerDiscoveryPage mode="collection" slugKey={slug} /></ClientOnly>;
  },
});
