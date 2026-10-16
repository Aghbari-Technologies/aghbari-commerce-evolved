import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Check, ChevronDown, CircleAlert, FilePlus2, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "prompts" | "governance";
type PromptStatus = "draft" | "pending_review" | "approved" | "rejected";
type PromptRow = {
  id: string; organization_id: string; prompt_key: string; display_name: string; description: string | null;
  prompt_body: string; version: number; status: PromptStatus; created_by: string; submitted_by: string | null;
  submitted_at: string | null; reviewed_by: string | null; reviewed_at: string | null; review_note: string | null;
  created_at: string; updated_at: string;
};
type AuditRow = { id: string; prompt_template_id: string; actor_profile_id: string; action: string; metadata: Record<string, unknown>; created_at: string };
type Props = { initialTab?: Tab };

const shell: CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "28px 20px 64px", color: "var(--foreground, #183b3c)" };
const panel: CSSProperties = { border: "1px solid var(--border, #dce8e6)", borderRadius: 16, background: "var(--card, #fff)", padding: 18 };
const muted: CSSProperties = { color: "var(--muted-foreground, #637b7b)", lineHeight: 1.8 };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid var(--border, #dce8e6)", borderRadius: 9, background: "var(--background, #fff)", color: "inherit" };
const actionButton: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 12px", border: "1px solid var(--border, #dce8e6)", borderRadius: 9, background: "var(--secondary, #edf5f3)", color: "inherit", cursor: "pointer", font: "inherit" };
const labels: Record<PromptStatus, string> = { draft: "مسودة", pending_review: "بانتظار المراجعة", approved: "معتمد حوكميًا", rejected: "مرفوض ويحتاج تعديلًا" };
const errorMessage = (error: unknown) => error && typeof error === "object" && "message" in error
  ? String((error as { message: unknown }).message)
  : "تعذر تنفيذ العملية. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.";
const displayDate = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("ar");
};

export function AdminAIControlPlane({ initialTab = "prompts" }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promptKey, setPromptKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [promptResult, auditResult] = await Promise.all([
        supabase.from("ai_prompt_templates").select("id,organization_id,prompt_key,display_name,description,prompt_body,version,status,created_by,submitted_by,submitted_at,reviewed_by,reviewed_at,review_note,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
        supabase.from("ai_prompt_audit_log").select("id,prompt_template_id,actor_profile_id,action,metadata,created_at").order("event_sequence", { ascending: false }).limit(100),
      ]);
      if (promptResult.error) throw promptResult.error;
      if (auditResult.error) throw auditResult.error;
      setPrompts((promptResult.data ?? []) as PromptRow[]);
      setAuditRows((auditResult.data ?? []) as AuditRow[]);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const pending = useMemo(() => prompts.filter((prompt) => prompt.status === "pending_review"), [prompts]);
  const resetForm = () => { setEditingId(null); setPromptKey(""); setName(""); setDescription(""); setBody(""); setReviewNote(""); };
  const editPrompt = (prompt: PromptRow) => {
    setEditingId(prompt.id); setPromptKey(prompt.prompt_key); setName(prompt.display_name);
    setDescription(prompt.description ?? ""); setBody(prompt.prompt_body); setReviewNote("");
    setTab("prompts"); setNotice(""); setError("");
  };
  const execute = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(successMessage); await reload(); }
    catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  };
  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[a-z][a-z0-9._-]{2,79}$/.test(promptKey.trim().toLowerCase())) {
      setError("مفتاح الأمر يجب أن يكون 3–80 حرفًا ويبدأ بحرف صغير.");
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 160 || body.trim().length < 20 || body.trim().length > 12000 || description.length > 600) {
      setError("تحقق من الحقول: الاسم 2–160، والوصف حتى 600، والنص 20–12000 حرف.");
      return;
    }
    await execute(async () => {
      const result = editingId
        ? await supabase.rpc("update_ai_prompt_draft", { p_id: editingId, p_display_name: name.trim(), p_description: description.trim() || null, p_prompt_body: body.trim() })
        : await supabase.rpc("create_ai_prompt_draft", { p_prompt_key: promptKey.trim().toLowerCase(), p_display_name: name.trim(), p_description: description.trim() || null, p_prompt_body: body.trim() });
      if (result.error) throw result.error;
      resetForm();
    }, editingId ? "تم حفظ تحديث المسودة." : "تم إنشاء مسودة ذات رقم إصدار جديد.");
  };
  const submitForReview = async (prompt: PromptRow) => execute(async () => {
    const result = await supabase.rpc("submit_ai_prompt_for_review", { p_id: prompt.id });
    if (result.error) throw result.error;
  }, "أُرسلت المسودة للمراجعة. لا يؤدي الإرسال إلى تفعيلها في محرك الذكاء.");
  const review = async (prompt: PromptRow, decision: "approve" | "reject") => execute(async () => {
    const result = await supabase.rpc("review_ai_prompt", { p_id: prompt.id, p_decision: decision, p_note: reviewNote.trim() || null });
    if (result.error) throw result.error;
    setReviewNote("");
  }, decision === "approve" ? "سُجّل الاعتماد الحوكمي؛ لم يتغير runtime." : "سُجّل الرفض ويمكن للمؤلف تحديث المسودة وإعادة تقديمها.");

  return <main dir="rtl" style={shell}>
    <header style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
      <div><p style={{ ...muted, margin: "0 0 4px" }}>الأغبري · مركز التحكم بالذكاء الاصطناعي</p><h1 style={{ margin: 0, fontSize: 29 }}>{tab === "prompts" ? "مكتبة أوامر الذكاء" : "حوكمة الأوامر والموافقات"}</h1><p style={muted}>إصدارات معزولة حسب المؤسسة، ومسار Maker–Checker وتدقيق لكل انتقال. لا تُحفظ أسرار API أو بيانات العملاء داخل هذه الشاشة.</p></div>
      <button type="button" style={actionButton} onClick={() => void reload()} disabled={busy || loading}><RefreshCw size={16}/> تحديث</button>
    </header>
    <nav aria-label="أقسام حوكمة الذكاء" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      <button type="button" aria-pressed={tab === "prompts"} style={actionButton} onClick={() => setTab("prompts")}>مكتبة الأوامر ({prompts.length})</button>
      <button type="button" aria-pressed={tab === "governance"} style={actionButton} onClick={() => setTab("governance")}>المراجعات ({pending.length}) وسجل التدقيق</button>
    </nav>
    <section style={{ ...panel, marginBottom: 16, borderColor: "#e3d3a7" }}>
      <strong style={{ display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={18}/> حدود التفعيل</strong>
      <p style={{ ...muted, marginBottom: 0 }}>هذه الشاشة تحفظ المسودات والإصدارات والموافقات فقط. الاعتماد لا ينشر الأمر ولا يشغّله؛ ربط runtime بالأوامر المعتمدة إجراء مستقل يتطلب اختبارات سلامة وتفعيلًا منضبطًا.</p>
    </section>
    {notice && <div role="status" style={{ ...panel, borderColor: "#9bcdb0", marginBottom: 12 }}>{notice}</div>}
    {error && <div role="alert" style={{ ...panel, borderColor: "#d6a0a0", marginBottom: 12 }}><CircleAlert size={17}/> {error}</div>}

    <section hidden={tab !== "prompts"} aria-labelledby="prompt-library-heading">
      <div style={{ ...panel, marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div><h2 id="prompt-library-heading" style={{ margin: 0 }}>{editingId ? "تعديل مسودة" : "إنشاء مسودة جديدة"}</h2><p style={muted}>المفتاح ثابت لكل إصدار. تعديل المرفوض يعيده لمسودة؛ كل إصدار جديد يحصل على رقم مستقل.</p></div>
          {editingId && <button type="button" style={actionButton} onClick={resetForm} disabled={busy}>إلغاء التحرير</button>}
        </div>
        <form onSubmit={(event) => void saveDraft(event)} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>مفتاح الأمر<input style={field} value={promptKey} onChange={(event) => setPromptKey(event.target.value)} minLength={3} maxLength={80} required disabled={Boolean(editingId) || busy} placeholder="inventory.reorder.advice"/></label>
          <label style={{ display: "grid", gap: 6 }}>اسم العرض<input style={field} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={160} required disabled={busy}/></label>
          <label style={{ display: "grid", gap: 6 }}>الوصف<input style={field} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} disabled={busy}/></label>
          <label style={{ display: "grid", gap: 6 }}>نص الأمر / القالب<textarea style={{ ...field, minHeight: 180, resize: "vertical" }} value={body} onChange={(event) => setBody(event.target.value)} minLength={20} maxLength={12000} required disabled={busy}/></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="submit" style={actionButton} disabled={busy}>{busy ? "جارٍ الحفظ..." : editingId ? "حفظ المسودة" : <><FilePlus2 size={16}/> إنشاء إصدار مسودة</>}</button>{!editingId && <button type="button" style={actionButton} onClick={resetForm} disabled={busy}>تفريغ الحقول</button>}</div>
        </form>
      </div>
      {loading ? <div style={panel} role="status">جارٍ تحميل إصدارات المؤسسة...</div> : prompts.length === 0 ? <div style={panel} role="status">لا توجد أوامر محفوظة لهذه المؤسسة. أنشئ مسودة لبدء مسار المراجعة.</div> :
        <div style={{ display: "grid", gap: 12 }}>{prompts.map((prompt) => <article key={prompt.id} style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}><div><code>{prompt.prompt_key} · v{prompt.version}</code><h2 style={{ margin: "8px 0 4px", fontSize: 20 }}>{prompt.display_name}</h2><p style={{ ...muted, margin: "0 0 8px" }}>{prompt.description || "بدون وصف"}</p></div><span style={{ borderRadius: 999, border: "1px solid var(--border, #dce8e6)", padding: "4px 10px" }}>{labels[prompt.status]}</span></div>
          <details><summary style={{ cursor: "pointer", fontWeight: 700 }}><ChevronDown size={14} style={{ display: "inline" }}/> عرض نص المسودة</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "var(--secondary, #edf5f3)", padding: 12, borderRadius: 9 }}>{prompt.prompt_body}</pre></details>
          <p style={muted}>إنشاء: {displayDate(prompt.created_at)} · آخر تحديث: {displayDate(prompt.updated_at)} · تقديم: {displayDate(prompt.submitted_at)} · مراجعة: {displayDate(prompt.reviewed_at)}</p>
          {prompt.review_note && <p role="note" style={muted}>ملاحظة المراجع: {prompt.review_note}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["draft","rejected"].includes(prompt.status) && <><button type="button" style={actionButton} onClick={() => editPrompt(prompt)} disabled={busy}>تحرير المسودة</button><button type="button" style={actionButton} onClick={() => void submitForReview(prompt)} disabled={busy}><Send size={15}/> تقديم للمراجعة</button></>}</div>
        </article>)}</div>}
    </section>

    <section hidden={tab !== "governance"} aria-labelledby="prompt-governance-heading">
      <div style={{ ...panel, marginBottom: 14 }}><h2 id="prompt-governance-heading" style={{ marginTop: 0 }}>قائمة انتظار المراجعة</h2><p style={muted}>لا يستطيع مؤلف المسودة اعتماد تقديمه. صلاحية manager/admin مطلوبة على الخادم؛ أي خطأ صلاحيات يتجاوز الواجهة.</p>
        {loading ? <p role="status">جارٍ تحميل قائمة المراجعة...</p> : pending.length === 0 ? <p role="status">لا توجد مسودات بانتظار المراجعة.</p> :
          <div style={{ display: "grid", gap: 10 }}>{pending.map((prompt) => <article key={prompt.id} style={{ border: "1px solid var(--border, #dce8e6)", borderRadius: 12, padding: 14 }}>
            <code>{prompt.prompt_key} · v{prompt.version}</code><h3>{prompt.display_name}</h3><p style={muted}>{prompt.description || "بدون وصف"}</p><details><summary>قراءة نص التقديم</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{prompt.prompt_body}</pre></details>
            <label style={{ display: "grid", gap: 6, margin: "10px 0" }}>ملاحظة المراجع (اختيارية، حتى 500 حرف)<textarea style={{ ...field, minHeight: 72 }} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={500} disabled={busy}/></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" style={actionButton} onClick={() => void review(prompt,"approve")} disabled={busy}><Check size={15}/> اعتماد حوكمي</button><button type="button" style={actionButton} onClick={() => void review(prompt,"reject")} disabled={busy}>رفض وإعادة للمؤلف</button></div>
          </article>)}</div>}
      </div>
      <div style={panel}><h2 style={{ marginTop: 0 }}>سجل تدقيق الأوامر</h2>{loading ? <p role="status">جارٍ تحميل سجل التدقيق...</p> : auditRows.length===0 ? <p role="status">لا توجد أحداث تدقيق بعد.</p> :
        <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}><thead><tr>{["الوقت","الإجراء","معرّف الإصدار","المنفّذ","البيانات الوصفية"].map((label) => <th key={label} scope="col" style={{ textAlign: "right", padding: 10 }}>{label}</th>)}</tr></thead><tbody>{auditRows.map((row) => <tr key={row.id}><td style={{ padding: 10, borderTop: "1px solid var(--border, #dce8e6)" }}>{displayDate(row.created_at)}</td><td style={{ padding: 10, borderTop: "1px solid var(--border, #dce8e6)" }}>{row.action}</td><td style={{ padding: 10, borderTop: "1px solid var(--border, #dce8e6)" }}><code>{row.prompt_template_id.slice(0,8)}</code></td><td style={{ padding: 10, borderTop: "1px solid var(--border, #dce8e6)" }}><code>{row.actor_profile_id.slice(0,8)}</code></td><td style={{ padding: 10, borderTop: "1px solid var(--border, #dce8e6)" }}><code>{JSON.stringify(row.metadata)}</code></td></tr>)}</tbody></table></div>}
      </div>
    </section>
  </main>;
}
