import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/ai/tasks")({
  head: () => ({ meta: [{ title: "مهام الذكاء الاصطناعي | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل مهام الذكاء الاصطناعي...</div>}><AdminApp initialView="ai" initialAiTab="tasks" /></ClientOnly>,
});
