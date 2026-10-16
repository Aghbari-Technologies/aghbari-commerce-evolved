import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "المنتجات | الأغبري" },
      { name: "description", content: "عرض المنتجات المتاحة من كتالوج الأغبري مع البحث وإجراءات المتجر الحالية." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل المنتجات...</main>}>
      <Storefront onExit={() => void navigate({ to: "/admin" })} />
    </ClientOnly>
  );
}
