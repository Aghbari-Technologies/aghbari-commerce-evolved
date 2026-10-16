import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerReorderTemplatePage } from "@/components/CustomerReorderTemplatePages";
export const Route=createFileRoute("/templates_/new")({head:()=>({meta:[{title:"إنشاء قالب شراء | الأغبري"},{name:"robots",content:"noindex"}]}),component:()=> <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل نموذج القالب...</main>}><CustomerReorderTemplatePage mode="new"/></ClientOnly>});
