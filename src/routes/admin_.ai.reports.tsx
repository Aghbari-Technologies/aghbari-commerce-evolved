import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/ai/reports")({
  head: () => ({ meta: [{ title: "تقارير الذكاء | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل التقارير...</div>}><AdminApp initialView="reports" /></ClientOnly>,
});
