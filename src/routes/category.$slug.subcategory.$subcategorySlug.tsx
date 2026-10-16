import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";
export const Route = createFileRoute("/category/$slug/subcategory/$subcategorySlug")({
  head: () => ({ meta: [{ title: "منتجات التصنيف الفرعي | الأغبري" }] }),
  component: function SubcategoryProductsPage() {
    const { slug, subcategorySlug } = Route.useParams();
    const navigate = useNavigate();
    return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل التصنيف الفرعي...</main>}><Storefront initialCategorySlug={slug} initialSubcategorySlug={subcategorySlug} onExit={() => void navigate({ to: "/admin" })} /></ClientOnly>;
  },
});
