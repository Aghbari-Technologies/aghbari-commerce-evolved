import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CompanyDetailsPage } from "@/components/CustomerAccount";

export const Route = createFileRoute("/onboarding/company")({
  head: () => ({ meta: [{ title: "بيانات الشركة | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل بيانات الشركة...</main>}><CompanyDetailsPage /></ClientOnly>,
});
