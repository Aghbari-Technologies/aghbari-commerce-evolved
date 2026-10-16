import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerHelpPage } from "@/components/CustomerHelpPages";
export const Route = createFileRoute("/help_/policies")({
  head: () => ({ meta: [{ title: "السياسات | الأغبري" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ التحقق من السياسات...</main>}><CustomerHelpPage topic="policies" /></ClientOnly>,
});
