import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "أسعار حسابك | الأغبري" },
      { name: "description", content: "الأسعار التي يسمح الخادم بعرضها لحساب العميل الحالي داخل كتالوج الأغبري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomerPricingPage,
});

function CustomerPricingPage() {
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل أسعار حسابك...</main>}>
      <Storefront onExit={() => void navigate({ to: "/admin" })} />
    </ClientOnly>
  );
}
