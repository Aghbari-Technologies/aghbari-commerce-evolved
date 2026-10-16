import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CompanyInvitationAcceptancePage } from "@/components/CustomerCompanyMembers";

export const Route = createFileRoute("/company/accept-invitation")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" && /^[0-9a-f]{64}$/i.test(search.token)
      ? search.token
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "قبول دعوة الشركة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div className="storefront" dir="rtl" role="status">جارٍ التحقق من الدعوة...</div>}>
      <CompanyInvitationAcceptancePage />
    </ClientOnly>
  ),
});
