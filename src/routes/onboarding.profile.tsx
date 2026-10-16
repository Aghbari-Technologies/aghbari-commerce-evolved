import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerProfilePage } from "@/components/CustomerAccount";

export const Route = createFileRoute("/onboarding/profile")({
  head: () => ({ meta: [{ title: "إكمال بيانات الملف | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل بيانات الحساب...</main>}><CustomerProfilePage /></ClientOnly>,
});
