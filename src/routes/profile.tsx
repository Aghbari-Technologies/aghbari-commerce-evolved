import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerProfilePage } from "@/components/CustomerAccount";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "ملفي الشخصي | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل الملف الشخصي...</main>}><CustomerProfilePage /></ClientOnly>,
});
