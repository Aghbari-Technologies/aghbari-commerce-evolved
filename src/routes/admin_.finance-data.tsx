import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/finance-data")({
  head: () => ({ meta: [{ title: "بيانات المالية | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل بيانات المالية...</div>}><AdminApp initialView="finance" /></ClientOnly>,
});
