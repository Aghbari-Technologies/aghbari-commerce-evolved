import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CompanyInvitationAcceptancePage } from "@/components/CustomerCompanyMembers";

export const Route = createFileRoute("/company/accept-invitation")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
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
