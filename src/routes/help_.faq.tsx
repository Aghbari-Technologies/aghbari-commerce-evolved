import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerHelpPage } from "@/components/CustomerHelpPages";
export const Route = createFileRoute("/help_/faq")({
  head: () => ({ meta: [{ title: "الأسئلة الشائعة | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل الأسئلة الشائعة...</main>}><CustomerHelpPage topic="faq" /></ClientOnly>,
});
