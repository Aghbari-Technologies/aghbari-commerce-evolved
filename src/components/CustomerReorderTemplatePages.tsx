import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Login } from "@/components/Login";
import { useAuth } from "@/lib/auth";
import { fetchProducts } from "@/lib/api";
import { matchesArabicCatalogSearch, normalizeCartDraft } from "@/lib/commerce-utils";
import { appendOfflineCartMutation, createOfflineCartMutationId, createOfflineCartScopeKey, writeLegacyCartOwner } from "@/lib/offline-cart-ledger";
import type { ProductWithInventory } from "@/lib/types";
import { createCustomerReorderTemplate, deleteCustomerReorderTemplate, fetchCustomerReorderTemplate, listCustomerReorderTemplates, updateCustomerReorderTemplate, type ReorderTemplateDetails, type ReorderTemplateInputLine, type ReorderTemplateSummary } from "@/lib/customer-reorder-templates";

type Mode = "list" | "new" | "view" | "edit";
const shell:CSSProperties={maxWidth:1100,margin:"0 auto",padding:"28px 20px 64px",color:"var(--foreground, #183b3c)"};
const card:CSSProperties={border:"1px solid var(--border, #dce8e6)",borderRadius:16,background:"var(--card, #fff)",padding:18};
const muted:CSSProperties={color:"var(--muted-foreground, #637b7b)",lineHeight:1.8};
const field:CSSProperties={width:"100%",minHeight:42,border:"1px solid var(--border, #dce8e6)",borderRadius:9,background:"var(--background, #fff)",color:"inherit",padding:"8px 10px"};
const primary:CSSProperties={border:0,borderRadius:9,background:"#116b5b",color:"#fff",padding:"10px 14px",fontWeight:700,cursor:"pointer"};

export function CustomerReorderTemplatePage({mode,templateId}:{mode:Mode;templateId?:string}){
 const {user,ready}=useAuth();const navigate=useNavigate();
 const scopeKey=createOfflineCartScopeKey(user?.profileId??null,typeof window==="undefined"?"server-render":window.location.origin);
 const [templates,setTemplates]=useState<ReorderTemplateSummary[]>([]);
 const [template,setTemplate]=useState<ReorderTemplateDetails|null>(null);
 const [products,setProducts]=useState<ProductWithInventory[]>([]);
 const [name,setName]=useState("طلب متكرر");const [query,setQuery]=useState("");
 const [quantities,setQuantities]=useState<Record<string,string>>({});const [unavailable,setUnavailable]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   if(mode==="list"){setTemplates(await listCustomerReorderTemplates());}
   else if(mode==="new"){setProducts(await fetchProducts());}
   else{
    if(!templateId)throw new Error("معرّف قالب الشراء مطلوب.");
    const [saved,catalog]=await Promise.all([fetchCustomerReorderTemplate(templateId),fetchProducts()]);
    setTemplate(saved);setName(saved.name);setProducts(catalog);
    const ids=new Set(catalog.map(row=>row.id));
    setUnavailable(saved.items.filter(item=>!item.product_id||!ids.has(item.product_id)).map(item=>item.id));
    setQuantities(Object.fromEntries(saved.items.filter(item=>item.product_id&&ids.has(item.product_id)).map(item=>[item.product_id as string,String(item.quantity)])));
   }
  }catch(cause){setError(cause instanceof Error?cause.message:"تعذر تحميل قوالب الشراء.");setTemplates([]);setTemplate(null);}
  finally{setLoading(false);}
 },[mode,templateId]);
 useEffect(()=>{if(ready&&user)void load();else if(ready)setLoading(false);},[ready,user,load]);
 const visibleProducts=useMemo(()=>products.filter(row=>matchesArabicCatalogSearch(row,query)),[products,query]);
 const lines:ReorderTemplateInputLine[]=useMemo(()=>Object.entries(quantities).filter(([,value])=>value.trim()!==""&&Number(value)>0).map(([product_id,value])=>({product_id,quantity:Number(value)})),[quantities]);

 async function save(event:FormEvent){
  event.preventDefault();setError("");setNotice("");if(busy)return;
  if(unavailable.length){setError("توجد أصناف محفوظة لم تعد ضمن كتالوج الخادم؛ لن يُسمح بحفظ تعديل يُسقطها بصمت.");return;}
  setBusy(true);
  try{
   const saved=mode==="edit"&&templateId?await updateCustomerReorderTemplate(templateId,name,lines):await createCustomerReorderTemplate(name,lines);
   setNotice("أكد الخادم حفظ القالب وأعيدت قراءته للتحقق.");
   await navigate({to:"/templates/$id" as never,params:{id:saved.id} as never});
  }catch(cause){setError(cause instanceof Error?cause.message:"تعذر حفظ قالب الشراء.");}
  finally{setBusy(false);}
 }
 async function remove(){
  if(!templateId||busy)return;
  if(typeof window!=="undefined"&&!window.confirm("سيُحذف قالب الشراء وأصنافه. هل تريد المتابعة؟"))return;
  setBusy(true);setError("");setNotice("");
  try{await deleteCustomerReorderTemplate(templateId);setNotice("أكد الخادم حذف القالب وتم التحقق من اختفائه.");await navigate({to:"/templates"});}
  catch(cause){setError(cause instanceof Error?cause.message:"تعذر حذف القالب.");}
  finally{setBusy(false);}
 }
 async function addToCart(){
  if(!template||busy)return;setBusy(true);setError("");
  try{
   const currentIds=new Set(products.map(row=>row.id));
   const raw=template.items.filter(item=>item.product_id&&currentIds.has(item.product_id)).map(item=>({product_id:item.product_id as string,quantity:Number(item.quantity)}));
   const lines=normalizeCartDraft(raw);
   if(!lines.length||lines.length!==template.items.length)throw new Error("توجد أصناف غير متاحة في القالب. راجعه قبل نقله إلى السلة.");
   if(!user?.profileId)throw new Error("سجّل الدخول قبل نقل القالب إلى السلة.");
   appendOfflineCartMutation(localStorage,scopeKey,{id:createOfflineCartMutationId(),kind:"merge",lines},[]);
   writeLegacyCartOwner(localStorage,scopeKey);await navigate({to:"/cart"});
  }catch(cause){setError(cause instanceof Error?cause.message:"تعذر نقل القالب إلى السلة.");}
  finally{setBusy(false);}
 }
 if(!ready||loading)return <main dir="rtl" className="storefront" style={shell} role="status">جارٍ تحميل قوالب الشراء من الخدمة...</main>;
 if(!user)return <Login />;

 return <main dir="rtl" className="storefront" style={shell}>
  <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",marginBottom:18}}>
   <div><p style={{...muted,margin:"0 0 4px"}}>الطلبات المتكررة</p><h1 style={{margin:0,fontSize:28}}>{mode==="list"?"قوالب الشراء":mode==="new"?"إنشاء قالب شراء":mode==="edit"?"تعديل قالب الشراء":"تفاصيل قالب الشراء"}</h1><p style={muted}>تُخزن القوالب عبر عقود الخادم وRLS؛ الأسعار لا تُحفظ داخل القالب.</p></div>
   <Link to="/templates" style={{display:"inline-flex",gap:7,alignItems:"center"}}><ArrowRight size={17}/> كل القوالب</Link>
  </header>
  {notice&&<p role="status" style={card}>{notice}</p>}
  {error&&<section role="alert" style={card}><p>{error}</p><button type="button" style={primary} onClick={()=>void load()}>إعادة المحاولة</button></section>}
  {mode==="list"&&<section style={{display:"grid",gap:12}}>
   <div><Link to="/templates/new" style={primary}><Plus size={16}/> إنشاء قالب جديد</Link></div>
   {!error&&!templates.length&&<div style={card} role="status">لا توجد قوالب شراء محفوظة لحسابك.</div>}
   {templates.map(row=><article key={row.id} style={{...card,display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h2 style={{margin:"0 0 5px",fontSize:20}}>{row.name}</h2><p style={muted}>آخر تحديث: {new Date(row.updated_at).toLocaleString("ar")}</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link to="/templates/$id" params={{id:row.id} as never}>التفاصيل</Link><Link to="/templates/$id/edit" params={{id:row.id} as never}>تعديل</Link></div></article>)}
  </section>}
  {(mode==="new"||mode==="edit")&&<form onSubmit={event=>void save(event)} style={{...card,display:"grid",gap:12}}>
   <label style={{display:"grid",gap:6}}>اسم القالب<input style={field} value={name} minLength={2} maxLength={100} required onChange={event=>setName(event.target.value)}/></label>
   <label style={{display:"grid",gap:6}}>بحث عن منتج<input style={field} value={query} maxLength={200} onChange={event=>setQuery(event.target.value)} placeholder="الاسم أو رمز الصنف"/></label>
   {mode==="edit"&&unavailable.length>0&&<p role="alert" style={{color:"#9a6700"}}>توجد أصناف محفوظة لم تعد متاحة؛ لا يمكن حفظ تعديل يسقطها ضمنيًا.</p>}
   <div style={{display:"grid",gap:8,maxHeight:420,overflow:"auto"}}>
    {visibleProducts.map(product=><div key={product.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 110px",gap:12,alignItems:"center",borderBottom:"1px solid var(--border, #dce8e6)",padding:"10px 0"}}><div><strong>{product.name}</strong><p style={{...muted,margin:"4px 0"}}><code>{product.item_code}</code> · {product.unit} · {typeof product.display_price==="number"?product.display_price.toLocaleString("ar"):"السعر غير متاح"}</p></div><label style={{display:"grid",gap:4}}>الكمية<input style={field} type="number" min={0} max={10000} step={1} aria-label={"كمية "+product.name} value={quantities[product.id]??""} onChange={event=>setQuantities(old=>({...old,[product.id]:event.target.value}))}/></label></div>)}
    {!visibleProducts.length&&<p role="status" style={muted}>لا توجد منتجات مطابقة للبحث.</p>}
   </div>
   <p style={muted}>عدد الأصناف المختارة: {lines.length}. الكمية الصحيحة لكل صنف من 1 إلى 10000.</p><button type="submit" style={primary} disabled={busy||unavailable.length>0}>{busy?"جارٍ الحفظ...":mode==="edit"?"حفظ التعديلات":"حفظ القالب"}</button>
  </form>}
  {mode==="view"&&template&&<section style={{display:"grid",gap:12}}>
   <div style={card}><h2 style={{marginTop:0}}>{template.name}</h2><p style={muted}>أُنشئ: {new Date(template.created_at).toLocaleString("ar")} · آخر تحديث: {new Date(template.updated_at).toLocaleString("ar")}</p><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link to="/templates/$id/edit" params={{id:template.id} as never}><Pencil size={16}/> تعديل</Link><button type="button" style={primary} disabled={busy} onClick={()=>void addToCart()}><ShoppingCart size={16}/> تحميل إلى السلة</button><button type="button" disabled={busy} onClick={()=>void remove()}><Trash2 size={16}/> حذف القالب</button></div></div>
   {template.items.map(item=><article key={item.id} style={card}><strong>{item.product_name_snapshot}</strong><p style={muted}>الرمز: <code>{item.item_code??"—"}</code> · الكمية: {Number(item.quantity)} {item.product_id?"":"· لم يعد الصنف مرتبطًا بمنتج نشط"}</p></article>)}
  </section>}
 </main>;
}
