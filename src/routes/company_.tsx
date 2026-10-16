import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CompanyDetailsPage } from "@/components/CustomerAccount";

export const Route = createFileRoute("/company_")({
  head: () => ({
    meta: [
      { title: "مساحة الشركة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل مساحة الشركة...</main>}>
      <CompanyDetailsPage />
    </ClientOnly>
  ),
});
