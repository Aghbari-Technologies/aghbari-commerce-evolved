import { createFileRoute, redirect } from "@tanstack/react-router";

const invitationTokenPattern = /^[0-9a-f]{64}$/i;

export const Route = createFileRoute("/invite/$token")({
  head: () => ({
    meta: [
      { title: "دعوة للانضمام إلى شركة | الأغبري" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ params }) => {
    if (invitationTokenPattern.test(params.token)) {
      throw redirect({
        to: "/company/accept-invitation",
        search: { token: params.token },
        replace: true,
      });
    }
  },
  component: InviteTokenEntryPage,
});

function InviteTokenEntryPage() {
  const { token } = Route.useParams();
  const validToken = invitationTokenPattern.test(token);
  return (
    <main className="storefront" dir="rtl" role={validToken ? "status" : "alert"} style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>دعوة للانضمام إلى الشركة</h1>
      {validToken
        ? <p>جارٍ فتح شاشة قبول الدعوة الآمنة...</p>
        : <p>رابط الدعوة غير صالح. اطلب رابطًا جديدًا من مسؤول شركتك.</p>}
      {!validToken && <a href="/login">تسجيل الدخول</a>}
    </main>
  );
}
