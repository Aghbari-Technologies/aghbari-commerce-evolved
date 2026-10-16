import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "كتالوج المنتجات | الأغبري" },
      { name: "description", content: "كتالوج الأغبري المبني على بيانات المنتجات والأسعار التي يعيدها الخادم." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل الكتالوج...</main>}>
      <Storefront onExit={() => void navigate({ to: "/admin" })} />
    </ClientOnly>
  );
}
