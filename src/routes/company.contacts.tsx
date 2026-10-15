import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerCompanyContactsPage } from "@/components/CustomerWorkflows";

export const Route = createFileRoute("/company/contacts")({
  head: () => ({
    meta: [
      { title: "جهات اتصال الشركة | الأغبري" },
      { name: "description", content: "إدارة جهات الاتصال التجارية في حساب الأغبري." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ تحميل جهات الاتصال...</div>}><CustomerCompanyContactsPage /></ClientOnly>,
});
