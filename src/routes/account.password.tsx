import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AccountPasswordPage } from "@/components/CustomerAccountSettingsPages";
export const Route = createFileRoute("/account/password")({
  head: () => ({ meta: [{ title: "تغيير كلمة المرور | الأغبري" }, { name: "robots", content: "noindex" }] }),
  component: () => <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ التحقق من الجلسة...</main>}><AccountPasswordPage /></ClientOnly>,
});
