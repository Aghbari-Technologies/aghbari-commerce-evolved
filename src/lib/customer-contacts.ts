import { supabase } from "@/lib/supabase";

export type CustomerContact = {
  id: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  contact_type: "general" | "purchasing" | "finance" | "warehouse" | "management";
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerContactInput = {
  id?: string | null;
  customerId?: string | null;
  full_name: string;
  job_title?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_type: CustomerContact["contact_type"];
  is_primary: boolean;
  is_active: boolean;
};

const clean = (value: string | null | undefined) => (value ?? "").trim();
const optional = (value: string | null | undefined) => clean(value) || null;

function validate(input: CustomerContactInput) {
  const value = {
    id: optional(input.id),
    customerId: optional(input.customerId),
    full_name: clean(input.full_name),
    job_title: optional(input.job_title),
    phone: optional(input.phone),
    email: optional(input.email)?.toLowerCase() ?? null,
    contact_type: input.contact_type,
    is_primary: input.is_primary === true,
    is_active: input.is_active !== false,
  };
  if (value.full_name.length < 2 || value.full_name.length > 120) throw new Error("اسم جهة الاتصال مطلوب (من حرفين إلى 120 حرفًا).");
  if ((value.job_title?.length ?? 0) > 100 || (value.phone?.length ?? 0) > 32 || (value.email?.length ?? 0) > 254) throw new Error("أحد حقول جهة الاتصال يتجاوز الحد المسموح.");
  if (!value.phone && !value.email) throw new Error("أدخل رقم هاتف أو بريدًا إلكترونيًا واحدًا على الأقل.");
  if (value.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email)) throw new Error("صيغة البريد الإلكتروني غير صحيحة.");
  if (!["general","purchasing","finance","warehouse","management"].includes(value.contact_type)) throw new Error("نوع جهة الاتصال غير مدعوم.");
  if (!value.is_active && value.is_primary) throw new Error("لا يمكن جعل جهة اتصال غير نشطة جهةً رئيسية.");
  return value;
}

export async function listCustomerContacts(customerId?: string | null): Promise<CustomerContact[]> {
  const { data, error } = await supabase.rpc("list_customer_contacts", { p_customer_id: clean(customerId) || null });
  if (error) throw new Error("تعذر تحميل جهات الاتصال: " + error.message);
  if (!Array.isArray(data)) throw new Error("أعاد الخادم قائمة جهات اتصال غير صالحة.");
  return data as CustomerContact[];
}

export async function saveCustomerContact(input: CustomerContactInput): Promise<string> {
  const v = validate(input);
  const { data, error } = await supabase.rpc("save_customer_contact", {
    p_contact_id: v.id,
    p_customer_id: v.customerId,
    p_full_name: v.full_name,
    p_job_title: v.job_title,
    p_phone: v.phone,
    p_email: v.email,
    p_contact_type: v.contact_type,
    p_is_primary: v.is_primary,
    p_is_active: v.is_active,
  });
  if (error) throw new Error("تعذر حفظ جهة الاتصال: " + error.message);
  if (typeof data !== "string" || !data) throw new Error("لم يؤكد الخادم حفظ جهة الاتصال.");
  return data;
}

export async function deleteCustomerContact(id: string, customerId?: string | null): Promise<void> {
  if (!clean(id)) throw new Error("حدد جهة اتصال صالحة للحذف.");
  const { data, error } = await supabase.rpc("delete_customer_contact", {
    p_contact_id: id,
    p_customer_id: clean(customerId) || null,
  });
  if (error) throw new Error("تعذر حذف جهة الاتصال: " + error.message);
  if (data !== true) throw new Error("لم يؤكد الخادم حذف جهة الاتصال.");
}
