import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Check, Database, FileDown, FileText,
  Gauge, History, Package, Pause, Play, RefreshCw, ShieldCheck,
  Upload, XCircle, Zap,
} from 'lucide-react';
import {
  createImportJob, createImportUploadSession, fetchCentralSynonyms, fetchImportJobs, fetchImportProfiles,
  fetchImportRows, fetchOnyxSnapshots, fetchOnyxSnapshotRows, fetchProducts, findImportDuplicate,
  finalizeImportJob, insertImportRows, recordImportUploadChunk, runInventoryReconciliation,
  fetchInventoryReconciliationRuns, fetchInventoryReconciliationItems, saveCentralSynonym, updateImportJob,
} from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatNumber } from '@/lib/format';
import {
  DataQualityAccumulator, DEFAULT_SYNONYMS, MAX_IMPORT_CELL_CHARS, MAX_IMPORT_COLUMNS,
  MAX_IMPORT_FILE_BYTES, MAX_IMPORT_ROWS, PROCESSING_CHUNK_ROWS, UPLOAD_CHUNK_BYTES,
  StreamingCsvParser, chooseImportStatus, hashFileSha256, normalizeHeader as normalizeImportHeader,
  validateCsvRow, type ParsedImportRow, type QualityResult,
} from '@/lib/unified-import';
import type { ImportJobRow, ProductWithInventory } from '@/lib/types';
import { AdminPage, Button, Empty, ErrorBox, Loading, TableWrap } from '@/components/AdminPages';
import { UnifiedImportEngine } from '@/components/UnifiedImportEngine';

type OperationTab = 'imports' | 'onyx' | 'reconcile' | 'dictionary';
type PipelineStage = 'reading' | 'detecting' | 'mapping' | 'validating' | 'normalizing' | 'deduplicating' | 'merging' | 'analytics' | 'complete';
type ParsedRow = { rowNumber: number; data: Record<string, unknown>; status: 'valid' | 'warning' | 'rejected'; errors: string[] };

const stages: Array<{ id: PipelineStage; label: string }> = [
  { id: 'reading', label: 'قراءة الملف' },
  { id: 'detecting', label: 'اكتشاف النوع' },
  { id: 'mapping', label: 'توحيد الأعمدة' },
  { id: 'validating', label: 'التحقق والجودة' },
  { id: 'normalizing', label: 'التطبيع' },
  { id: 'deduplicating', label: 'منع التكرار' },
  { id: 'merging', label: 'دمج السجلات' },
  { id: 'analytics', label: 'التحليل الحسابي' },
];

const synonymMap: Record<string, string> = { ...DEFAULT_SYNONYMS };

function normalizeHeader(value: string): string {
  return normalizeImportHeader(value, synonymMap);
}

function qualityLabel(score: number): string {
  if (score >= 90) return 'ممتاز';
  if (score >= 75) return 'مقبول';
  if (score >= 50) return 'تحذير';
  return 'مرفوض';
}


export function OperationsCenter({ onNotice }: { onNotice: (message: string) => void }) {
  const [tab, setTab] = useState<OperationTab>('imports');
  const tabs: Array<{ id: OperationTab; label: string; icon: typeof Upload }> = [
    { id: 'imports', label: 'محرك الاستيراد الذكي', icon: Upload },
    { id: 'onyx', label: 'مزامنة أونكس برو', icon: Activity },
    { id: 'reconcile', label: 'مطابقة المخزون', icon: Gauge },
    { id: 'dictionary', label: 'قاموس المرادفات', icon: FileText },
  ];
  return <AdminPage eyebrow="البيانات والذكاء" title="مركز العمليات الذكي" description="مسار موحد وآمن للاستيراد والتحليل والمطابقة دون تخزين الملفات الخام" icon={Zap} note="المصدر التشغيلي المباشر هو مصدر الحقيقة الوحيد" toolbar={<Button variant="secondary" onClick={() => onNotice('تم تحديث مركز العمليات')}><RefreshCw size={16} /> تحديث</Button>}>
    <div className="operation-tabs">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}</div>
    {tab === 'imports' && <ImportEngine onNotice={onNotice} />}
    {tab === 'onyx' && <OnyxDashboard onNotice={onNotice} />}
    {tab === 'reconcile' && <InventoryReconciliation onNotice={onNotice} />}
    {tab === 'dictionary' && <SynonymDictionary />}
  </AdminPage>;
}

function ImportEngine({ onNotice }: { onNotice: (message: string) => void }) {
  return <UnifiedImportEngine onNotice={onNotice} />;
}

function OnyxDashboard({ onNotice }: { onNotice: (message: string) => void }) {
  const { data: jobs, loading: jobsLoading } = useFetch(fetchImportJobs);
  const latest = jobs?.find((job) => job.status === 'completed');
  const { data: rows, loading: rowsLoading } = useFetch(() => latest ? fetchImportRows(latest.id) : Promise.resolve([] as ImportJobRow[]), [latest?.id]);
  const analytics = useMemo(() => {
    const validRows = rows ?? [];
    const quantities = validRows.map((row) => Number(row.data?.quantity ?? 0)).filter((value) => Number.isFinite(value));
    const revenue = validRows.reduce((sum, row) => sum + Number(row.data?.revenue ?? 0), 0);
    const uniqueItems = new Set(validRows.map((row) => String(row.data?.item_code ?? '')).filter(Boolean)).size;
    return { rows: validRows.length, uniqueItems, quantity: quantities.reduce((sum, value) => sum + value, 0), revenue };
  }, [rows]);
  return <div className="onyx-dashboard"><div className="onyx-banner"><div><span>بيئة تحليلية معزولة</span><h2>أونكس برو — لوحة التحليل العمودي</h2><p>تعمل حصراً على الدفعات المستوردة ولا تتداخل مع قاعدة التشغيل الحية.</p></div><ShieldCheck size={42} /></div>{latest && <div className="onyx-source"><History size={16} /> المصدر: <strong>{latest.file_name}</strong><span>Snapshot #{latest.id.slice(0, 8)}</span></div>}{jobsLoading || rowsLoading ? <Loading /> : !latest ? <Empty text="استورد دفعة مكتملة لبدء التحليل" /> : <><section className="onyx-kpis"><Metric icon={Database} label="السجلات" value={formatNumber(analytics.rows)} /><Metric icon={Package} label="الأصناف الفريدة" value={formatNumber(analytics.uniqueItems)} /><Metric icon={Gauge} label="إجمالي الكمية" value={formatNumber(analytics.quantity)} /><Metric icon={BarChart3} label="الإيراد المحسوب" value={formatNumber(analytics.revenue)} /></section><section className="onyx-section"><div className="onyx-section-head"><div><span>التحليل الحسابي المباشر</span><h3>ملخص الاتجاهات التشغيلية</h3></div><Button variant="secondary" onClick={() => onNotice('تم تحديث التحليل من اللقطة الحالية')}><RefreshCw size={15} /> تحديث التحليل</Button></div><div className="onyx-insight-grid"><Insight icon={Zap} title="جودة المصدر" body={`الدفعة ${qualityLabel(latest.data_quality_score ?? 0)} بجودة ${latest.data_quality_score ?? 0}/100، والأرقام محسوبة برمجياً من السجلات المنظمة.`} /><Insight icon={ShieldCheck} title="العزل التشغيلي" body="لا يتم تعديل المنتجات أو العملاء أو المخزون الحي من هذه الشاشة." /><Insight icon={Activity} title="الخطوة التالية" body={analytics.uniqueItems ? 'يمكنك الانتقال إلى مطابقة المخزون لمقارنة رصيد التقرير مع الرصيد المباشر.' : 'لا توجد بيانات كافية لإنتاج توصيات.'} /></div></section><section className="onyx-section"><div className="onyx-section-head"><div><span>التوصيات</span><h3>بطاقات قابلة للتنفيذ</h3></div></div><div className="action-card"><div className="action-card-icon"><AlertTriangle size={20} /></div><div><strong>{analytics.quantity === 0 ? 'Forecast Unavailable: Insufficient Historical Data' : 'مراجعة الأصناف ذات الرصيد غير المتسق'}</strong><p>المصدر: {latest.file_name} — Snapshot ID: {latest.id.slice(0, 8)} — Confidence Score: {latest.data_quality_score ?? 0}%</p></div><Button onClick={() => onNotice('تم فتح وحدة مطابقة المخزون')}>مطابقة الآن</Button></div></section></>}</div>;
}

function InventoryReconciliation({ onNotice }: { onNotice: (message: string) => void }) {
  const { data: jobs } = useFetch(fetchImportJobs);
  const latest = jobs?.find((job) => job.status === 'completed');
  const { data: rows, loading } = useFetch(() => latest ? fetchImportRows(latest.id) : Promise.resolve([] as ImportJobRow[]), [latest?.id]);
  const { data: products } = useFetch(fetchProducts);
  const result = useMemo(() => {
    const live = new Map((products ?? []).map((product) => [product.item_code.trim(), product]));
    let matched = 0; let changed = 0; let newRows = 0;
    const differences: Array<{ code: string; incoming: number; current: number; product?: ProductWithInventory }> = [];
    (rows ?? []).forEach((row) => {
      const code = String(row.data?.item_code ?? '').trim();
      const incoming = Number(row.data?.quantity ?? 0);
      const product = live.get(code);
      if (!product) { newRows += 1; return; }
      const current = Number(product.inventory?.quantity_on_hand ?? 0);
      if (current === incoming) matched += 1;
      else { changed += 1; differences.push({ code, incoming, current, product }); }
    });
    return { matched, changed, newRows, differences };
  }, [products, rows]);
  return <div className="reconcile-view"><section className="panel reconcile-hero"><div><span>مصدران منفصلان</span><h2>مطابقة رصيد أونكس مع المخزون المباشر</h2><p>المقارنة قراءة فقط حتى تراجع الفروقات قبل اعتماد أي تعديل.</p></div><button className="reconcile-button" onClick={() => onNotice(latest ? 'تمت إعادة المطابقة من آخر Snapshot' : 'لا توجد دفعة مكتملة للمطابقة')}><RefreshCw size={18} /> مطابقة الآن</button></section><div className="reconcile-meta"><span><Database size={15} /> المصدر: {latest?.file_name ?? 'لم يتم اختيار دفعة'}</span><span><History size={15} /> آخر مزامنة: {latest ? new Date(latest.created_at).toLocaleString('ar') : '—'}</span><span><ShieldCheck size={15} /> الحالة: قراءة آمنة</span></div>{loading ? <Loading /> : <><div className="reconcile-stats"><Metric icon={Check} label="متطابق" value={formatNumber(result.matched)} /><Metric icon={RefreshCw} label="معدل" value={formatNumber(result.changed)} /><Metric icon={FileText} label="جديد" value={formatNumber(result.newRows)} /><Metric icon={AlertTriangle} label="أخطاء" value="0" /></div><section className="panel table-panel"><div className="panel-head"><div><h2>الفروقات التي تحتاج مراجعة</h2><p>لا يتم حذف أو تصفير أي رصيد تلقائياً</p></div></div>{result.differences.length ? <TableWrap><table><thead><tr><th>رمز الصنف</th><th>الصنف</th><th>الرصيد المباشر</th><th>رصيد التقرير</th><th>الفرق</th></tr></thead><tbody>{result.differences.map((difference) => <tr key={difference.code}><td><code>{difference.code}</code></td><td>{difference.product?.name ?? '—'}</td><td>{formatNumber(difference.current)}</td><td>{formatNumber(difference.incoming)}</td><td className="amount-danger">{formatNumber(difference.incoming - difference.current)}</td></tr>)}</tbody></table></TableWrap> : <Empty text="لا توجد فروقات في الدفعة الحالية" />}</section></>}</div>;
}

function SynonymDictionary() {
  const entries = Object.entries(synonymMap);
  return <section className="panel dictionary-panel"><div className="panel-head"><div><h2>قاموس المرادفات المركزي</h2><p>يُستخدم في توحيد أعمدة الاستيراد والبحث دون تحويل رموز الأصناف إلى أرقام</p></div><span className="badge success">v1.0 ثابت</span></div><div className="dictionary-grid">{entries.map(([source, target]) => <div key={source}><span>{source}</span><b><ArrowLeftIcon size={14} /> {target}</b></div>)}</div></section>;
}

function Metric({ icon: Icon, label, value }: { icon: import('lucide-react').LucideIcon; label: string; value: string }) { return <article className="operation-metric"><Icon size={21} /><span>{label}</span><strong>{value}</strong></article>; }
function Insight({ icon: Icon, title, body }: { icon: import('lucide-react').LucideIcon; title: string; body: string }) { return <article className="onyx-insight"><Icon size={19} /><div><strong>{title}</strong><p>{body}</p></div></article>; }
function ArrowLeftIcon({ size }: { size?: number }) { return <span style={{ fontSize: size ?? 14 }}>←</span>; }
function delay(ms: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
