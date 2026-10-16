import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";
export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "أحدث المنتجات | الأغبري" }] }),
  component: function NewProductsPage() {
    const navigate = useNavigate();
    return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل أحدث المنتجات...</main>}><Storefront initialCatalogMode="newest" onExit={() => void navigate({ to: "/admin" })} /></ClientOnly>;
  },
});
