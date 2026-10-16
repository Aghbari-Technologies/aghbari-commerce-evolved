import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/import-logs")({
  head: () => ({ meta: [{ title: "سجل دفعات الاستيراد | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل سجل الاستيراد...</div>}><AdminApp initialView="operations" initialOperationTab="import-logs" /></ClientOnly>,
});
