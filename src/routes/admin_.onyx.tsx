import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/onyx")({
  head: () => ({ meta: [{ title: "مزامنة أونكس برو | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل حالة أونكس...</div>}><AdminApp initialView="operations" initialOperationTab="onyx" /></ClientOnly>,
});
