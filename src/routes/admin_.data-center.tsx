import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/data-center")({
  head: () => ({ meta: [{ title: "مركز البيانات الموحد | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل مركز البيانات...</div>}><AdminApp initialView="data" /></ClientOnly>,
});
