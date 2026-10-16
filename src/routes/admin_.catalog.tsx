import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/AghbariApp";
export const Route = createFileRoute("/admin_/catalog")({
  head: () => ({ meta: [{ title: "كتالوج الإدارة | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل الكتالوج...</div>}><AdminApp initialView="products" /></ClientOnly>,
});
