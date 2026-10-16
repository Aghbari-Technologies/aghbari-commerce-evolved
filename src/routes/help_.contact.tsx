import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerHelpContactPage } from "@/components/CustomerHelpPages";
export const Route = createFileRoute("/help_/contact")({
  head: () => ({ meta: [{ title: "التواصل | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل بيانات التواصل...</main>}><CustomerHelpContactPage /></ClientOnly>,
});
