import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/ai/alerts")({
  head: () => ({ meta: [{ title: "تنبيهات الذكاء الاصطناعي | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل تنبيهات الذكاء الاصطناعي...</div>}><AdminApp initialView="ai" initialAiTab="alerts" /></ClientOnly>,
});
