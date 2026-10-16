import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/ai/sync")({
  head: () => ({ meta: [{ title: "مزامنة البيانات | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل مزامنة البيانات...</div>}><AdminApp initialView="operations" initialOperationTab="onyx" /></ClientOnly>,
});
