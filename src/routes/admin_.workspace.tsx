import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/workspace")({
  head: () => ({ meta: [{ title: "مساحة تشغيل الإدارة | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل مساحة التشغيل...</div>}><AdminApp initialView="dashboard" /></ClientOnly>,
});
