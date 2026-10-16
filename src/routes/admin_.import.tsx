import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/import")({
  head: () => ({ meta: [{ title: "استيراد البيانات | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل محرك الاستيراد...</div>}><AdminApp initialView="operations" initialOperationTab="imports" /></ClientOnly>,
});
