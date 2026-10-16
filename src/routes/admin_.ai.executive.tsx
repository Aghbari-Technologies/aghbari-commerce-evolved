import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/ai/executive")({
  head: () => ({ meta: [{ title: "التقارير التنفيذية | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل التقرير التنفيذي...</div>}><AdminApp initialView="reports" /></ClientOnly>,
});
