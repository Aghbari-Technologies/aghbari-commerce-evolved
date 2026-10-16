import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/checkout/review")({
  head: () => ({
    meta: [
      { title: "مراجعة الطلب | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReviewPage,
});

function CheckoutReviewPage() {
  const navigate = useNavigate();
  return (
    <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ مراجعة سلة الطلب...</div>}>
      <Storefront initialView="checkout" onExitLabel="العودة إلى السلة" onExit={() => void navigate({ to: "/cart" })} />
    </ClientOnly>
  );
}
