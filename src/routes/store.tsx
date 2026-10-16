import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "المتجر | الأغبري" },
      { name: "description", content: "تصفح كتالوج الأغبري وأسعار ومخزون التجارة بالجملة." },
    ],
  }),
  component: StoreAliasPage,
});

function StoreAliasPage() {
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل المتجر...</div>}>
      <Storefront onExit={() => void navigate({ to: "/admin" })} />
    </ClientOnly>
  );
}
