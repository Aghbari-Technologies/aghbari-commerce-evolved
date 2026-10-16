import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerReorderTemplatePage } from "@/components/CustomerReorderTemplatePages";
export const Route=createFileRoute("/templates_/$id/edit")({head:()=>({meta:[{title:"تعديل قالب الشراء | الأغبري"},{name:"robots",content:"noindex"}]}),component:function TemplateEditRoute(){const {id}=Route.useParams();return <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل نموذج التعديل...</main>}><CustomerReorderTemplatePage mode="edit" templateId={id}/></ClientOnly>;}});
