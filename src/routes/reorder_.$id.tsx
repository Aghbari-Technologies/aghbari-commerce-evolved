import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerReorderTemplatePage } from "@/components/CustomerReorderTemplatePages";
export const Route=createFileRoute("/reorder_/$id")({head:()=>({meta:[{title:"إعادة الطلب | الأغبري"},{name:"robots",content:"noindex"}]}),component:function ReorderTemplateRoute(){const {id}=Route.useParams();return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل القالب...</main>}><CustomerReorderTemplatePage mode="view" templateId={id}/></ClientOnly>;}});
