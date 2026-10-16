import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";
export const Route = createFileRoute("/category/$slug")({
  head: () => ({ meta: [{ title: "منتجات التصنيف | الأغبري" }] }),
  component: function CategoryProductsPage() {
    const { slug } = Route.useParams();
    const navigate = useNavigate();
    return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل منتجات التصنيف...</main>}><Storefront initialCategorySlug={slug} onExit={() => void navigate({ to: "/admin" })} /></ClientOnly>;
  },
});
