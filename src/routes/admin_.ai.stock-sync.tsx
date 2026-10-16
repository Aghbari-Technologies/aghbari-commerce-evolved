import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/ai/stock-sync")({
  head: () => ({ meta: [{ title: "مطابقة المخزون | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل مطابقة المخزون...</div>}><AdminApp initialView="operations" initialOperationTab="reconcile" /></ClientOnly>,
});
