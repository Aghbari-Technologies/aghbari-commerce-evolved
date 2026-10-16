import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { CustomerReorderTemplatePage } from "@/components/CustomerReorderTemplatePages";
export const Route=createFileRoute("/templates")({head:()=>({meta:[{title:"قوالب الشراء | الأغبري"},{name:"robots",content:"noindex"}]}),component:()=> <ClientOnly fallback={<main dir="rtl" className="storefront" role="status">جارٍ تحميل قوالب الشراء...</main>}><CustomerReorderTemplatePage mode="list"/></ClientOnly>});
