import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q.slice(0, 200) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "بحث المنتجات | الأغبري" },
      { name: "description", content: "ابحث في كتالوج الأغبري باستخدام بيانات المنتجات المتاحة." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل بحث المنتجات...</main>}>
      <Storefront initialQuery={q ?? ""} onExit={() => void navigate({ to: "/admin" })} />
    </ClientOnly>
  );
}
