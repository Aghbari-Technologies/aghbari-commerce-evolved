import { supabase } from "@/lib/supabase";

export type ReorderTemplateSummary = { id:string; name:string; created_at:string; updated_at:string; source_order_id:string|null };
export type ReorderTemplateLine = { id:string; template_id:string; product_id:string|null; item_code:string|null; product_name_snapshot:string; quantity:number|string; created_at:string };
export type ReorderTemplateDetails = ReorderTemplateSummary & { items:ReorderTemplateLine[] };
export type ReorderTemplateInputLine = { product_id:string; quantity:number };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCustomerReorderTemplateInput(name:string,lines:ReorderTemplateInputLine[]) {
 const normalized=name.trim();
 if(normalized.length<2||normalized.length>100) throw new Error("اسم القالب يجب أن يتراوح بين حرفين و100 حرف.");
 if(!Array.isArray(lines)||lines.length<1||lines.length>100) throw new Error("اختر صنفًا واحدًا على الأقل وبحد أقصى 100 صنف.");
 const seen=new Set<string>();
 for(const line of lines) {
  if(!line||typeof line.product_id!=="string"||!UUID.test(line.product_id)) throw new Error("يوجد صنف بمعرّف غير صالح.");
  if(seen.has(line.product_id)) throw new Error("لا تكرر الصنف نفسه داخل القالب.");
  seen.add(line.product_id);
  if(!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>10000) throw new Error("يجب أن تكون الكمية عددًا صحيحًا بين 1 و10000.");
 }
 return {name:normalized,lines};
}
function validId(value:string){if(!UUID.test(value))throw new Error("معرّف قالب إعادة الطلب غير صالح.");}

export async function listCustomerReorderTemplates():Promise<ReorderTemplateSummary[]>{
 const r=await supabase.from("reorder_templates").select("id,name,created_at,updated_at,source_order_id").order("updated_at",{ascending:false}).limit(100);
 if(r.error)throw new Error("تعذر تحميل قوالب الشراء: "+r.error.message);
 return (r.data??[]) as ReorderTemplateSummary[];
}
export async function fetchCustomerReorderTemplate(id:string):Promise<ReorderTemplateDetails>{
 validId(id);
 const h=await supabase.from("reorder_templates").select("id,name,created_at,updated_at,source_order_id").eq("id",id).maybeSingle();
 if(h.error)throw new Error("تعذر قراءة قالب الشراء: "+h.error.message);
 if(!h.data)throw new Error("القالب غير موجود أو لا تملك صلاحية عرضه.");
 const r=await supabase.from("reorder_template_items").select("id,template_id,product_id,item_code,product_name_snapshot,quantity,created_at").eq("template_id",id).order("created_at",{ascending:true});
 if(r.error)throw new Error("تعذر قراءة أصناف القالب: "+r.error.message);
 return {...(h.data as ReorderTemplateSummary),items:(r.data??[]) as ReorderTemplateLine[]};
}
export async function createCustomerReorderTemplate(name:string,lines:ReorderTemplateInputLine[]):Promise<ReorderTemplateDetails>{
 const input=validateCustomerReorderTemplateInput(name,lines);
 const r=await supabase.rpc("save_reorder_template",{p_name:input.name,p_lines:input.lines,p_source_order_id:null});
 if(r.error)throw new Error("تعذر حفظ قالب الشراء: "+r.error.message);
 if(typeof r.data!=="string"||!UUID.test(r.data))throw new Error("لم يؤكد الخادم معرّف قالب صالحًا بعد الحفظ.");
 const saved=await fetchCustomerReorderTemplate(r.data);verifySaved(saved,input.name,input.lines);return saved;
}
export async function updateCustomerReorderTemplate(id:string,name:string,lines:ReorderTemplateInputLine[]):Promise<ReorderTemplateDetails>{
 validId(id);const input=validateCustomerReorderTemplateInput(name,lines);
 const r=await supabase.rpc("update_reorder_template",{p_template_id:id,p_name:input.name,p_lines:input.lines});
 if(r.error)throw new Error("تعذر تحديث قالب الشراء: "+r.error.message);
 if(r.data!==id)throw new Error("لم يؤكد الخادم معرّف القالب بعد التحديث.");
 const saved=await fetchCustomerReorderTemplate(id);verifySaved(saved,input.name,input.lines);return saved;
}
function verifySaved(saved:ReorderTemplateDetails,name:string,lines:ReorderTemplateInputLine[]){
 if(saved.name!==name||saved.items.length!==lines.length)throw new Error("لم تتطابق قراءة القالب بعد الكتابة مع المدخلات.");
 const expected=new Map(lines.map(line=>[line.product_id,line.quantity]));
 for(const item of saved.items)if(!item.product_id||Number(item.quantity)!==expected.get(item.product_id))throw new Error("قراءة القالب بعد الكتابة لا تطابق الأصناف وكمياتها.");
}
export async function deleteCustomerReorderTemplate(id:string):Promise<void>{
 validId(id);
 const r=await supabase.from("reorder_templates").delete().eq("id",id).select("id");
 if(r.error)throw new Error("تعذر حذف القالب: "+r.error.message);
 if(!Array.isArray(r.data)||r.data.length!==1||r.data[0]?.id!==id)throw new Error("لم يؤكد الخادم حذف القالب؛ قد لا تملك صلاحية حذفه.");
 const verify=await supabase.from("reorder_templates").select("id").eq("id",id).maybeSingle();
 if(verify.error)throw new Error("تعذر التحقق من حذف القالب: "+verify.error.message);
 if(verify.data)throw new Error("ما زال القالب ظاهرًا بعد محاولة الحذف.");
}
