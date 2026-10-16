import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountApprovalStatusPage } from "@/components/CustomerAccount";

export const Route = createFileRoute("/account/pending")({
  head: () => ({ meta: [{ title: "حالة اعتماد الحساب | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ التحقق من حالة الحساب...</main>}><AccountApprovalStatusPage /></ClientOnly>,
});
