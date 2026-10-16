import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { OrderInvoice } from "@/components/CustomerOrders";

const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/checkout/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === "string" && orderIdPattern.test(search.orderId)
      ? search.orderId
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "تأكيد الطلب | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutConfirmationRoute,
});

function CheckoutConfirmationRoute() {
  const { orderId } = Route.useSearch();
  return <CheckoutConfirmationPage orderId={orderId} />;
}

export function CheckoutConfirmationPage({ orderId }: { orderId?: string }) {
  if (!orderId || !orderIdPattern.test(orderId)) {
    return (
      <main className="storefront" dir="rtl" style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        <h1>تأكيد الطلب</h1>
        <p role="alert">لا يوجد رقم طلب مؤكد في هذا الرابط. لن نعرض نجاحًا دون سجل أنشأه الخادم.</p>
        <p>للتأكد من طلب سابق، افتح سجل طلباتك. إذا لم ترسل طلبًا بعد، ارجع إلى السلة وابدأ الإتمام.</p>
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }} aria-label="إجراءات الطلب">
          <a className="sf-btn-primary" href="/orders">فتح طلباتي</a>
          <a className="sf-btn-secondary" href="/cart">العودة إلى السلة</a>
        </nav>
      </main>
    );
  }

  return (
    <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل سجل الطلب المؤكد...</div>}>
      <OrderInvoice id={orderId} />
    </ClientOnly>
  );
}
