import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/order/$id")({
  params: { parse: (params) => ({ id: z.string().uuid().parse(params.id) }) },
  head: () => ({ meta: [{ title: "تفاصيل الطلب | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminOrderRoute />,
});
function AdminOrderRoute() {
  const { id } = Route.useParams();
  return <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل تفاصيل الطلب...</div>}><AdminApp initialView="orders" initialOrderDetailId={id} /></ClientOnly>;
}
