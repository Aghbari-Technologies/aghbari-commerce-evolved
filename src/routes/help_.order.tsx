import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerHelpPage } from "@/components/CustomerHelpPages";
export const Route = createFileRoute("/help_/order")({
  head: () => ({ meta: [{ title: "مساعدة الطلبات | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل إرشادات الطلبات...</main>}><CustomerHelpPage topic="order" /></ClientOnly>,
});
