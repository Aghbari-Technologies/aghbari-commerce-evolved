import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerDiscoveryPage } from "@/components/CustomerDiscoveryPages";
export const Route = createFileRoute("/search_/advanced")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({ q: typeof search.q === "string" ? search.q.slice(0, 200) : undefined }),
  head: () => ({ meta: [{ title: "البحث المتقدم | الأغبري" }] }),
  component: function AdvancedSearchPage() {
    return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل البحث المتقدم...</main>}><CustomerDiscoveryPage mode="advanced-search" /></ClientOnly>;
  },
});
