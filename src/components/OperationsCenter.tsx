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
  const { data: snapshots, loading, error, refetch } = useFetch(fetchOnyxSnapshots);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const selectedId = selectedSnapshotId || snapshots?.[0]?.id || '';
  const selected = snapshots?.find((snapshot) => snapshot.id === selectedId);
  const { data: rows, loading: rowsLoading, refetch: refetchRows } = useFetch(
    () => selectedId ? fetchOnyxSnapshotRows(selectedId) : Promise.resolve([]),
    [selectedId],
  );
  const [reconciling, setReconciling] = useState(false);
  const analytics = useMemo(() => {
    const validRows = rows ?? [];
    const quantities = validRows.map((row) => Number(row.data?.quantity ?? 0)).filter((value) => Number.isFinite(value));
    const revenue = validRows.reduce((sum, row) => sum + Number(row.data?.revenue ?? 0), 0);
    const uniqueItems = new Set(validRows.map((row) => String(row.canonical_key ?? row.data?.item_code ?? '')).filter(Boolean)).size;
    return {
      rows: validRows.length,
      uniqueItems,
      quantity: quantities.reduce((sum, value) => sum + value, 0),
      revenue,
    };
  }, [rows]);

  async function reconcileNow() {
    if (!selectedId || reconciling) return;
    setReconciling(true);
    try {
      const result = await runInventoryReconciliation(selectedId);
      onNotice('اكتملت المطابقة: ' + result.matched_count + ' متطابق، ' + result.changed_count + ' مختلف، ' + result.new_count + ' جديد، ' + result.invalid_count + ' غير صالح.');
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'تعذر تنفيذ المطابقة');
    } finally {
      setReconciling(false);
    }
  }

  return <div className="onyx-dashboard">
    <div className="onyx-banner"><div><span>بيئة تحليلية معزولة</span><h2>أونكس برو — لقطات مستوردة مستقلة</h2><p>تعتمد التحليلات هنا على Snapshot ثابت من الاستيراد؛ لا تعدّل هذه الشاشة المنتجات أو المخزون التشغيلي.</p></div><ShieldCheck size={42} /></div>
    <section className="panel" style={{ margin: '14px 0' }}>
      <div className="panel-head"><div><h2>مصدر التحليل</h2><p>اختر لقطة معتمدة. لا تُحلّل دفعات staging أو قيد المراجعة.</p></div><Button variant="outline" onClick={() => { refetch(); refetchRows(); }}><RefreshCw size={15} /> تحديث</Button></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : !snapshots?.length ? <Empty text="لا توجد لقطات Onyx معتمدة. أكمل استيرادًا بجودة مقبولة أولًا." /> :
        <label className="form-field"><span>Snapshot</span><select value={selectedId} onChange={(event) => setSelectedSnapshotId(event.target.value)}>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.source_file_name ?? 'ملف مستورد'} — v{snapshot.snapshot_version} — {new Date(snapshot.created_at).toLocaleString('ar')}</option>)}</select></label>}
    </section>
    {selected && !loading && <>
      <div className="onyx-source"><History size={16} /> المصدر: <strong>{selected.source_file_name ?? '—'}</strong><span>Snapshot #{selected.id.slice(0, 8)} • Version {selected.snapshot_version}</span><span>جودة المصدر {selected.data_quality_score}/100</span></div>
      {rowsLoading ? <Loading /> : <section className="onyx-kpis">
        <Metric icon={Database} label="السجلات في اللقطة" value={formatNumber(analytics.rows)} />
        <Metric icon={Package} label="مفاتيح فريدة" value={formatNumber(analytics.uniqueItems)} />
        <Metric icon={Gauge} label="إجمالي الكمية" value={formatNumber(analytics.quantity)} />
        <Metric icon={BarChart3} label="الإيراد المحسوب" value={formatNumber(analytics.revenue)} />
      </section>}
      <section className="onyx-section">
        <div className="onyx-section-head"><div><span>تحليل حتمي</span><h3>مصدر البيانات وجودتها</h3></div></div>
        <div className="onyx-insight-grid">
          <Insight icon={ShieldCheck} title="العزل التشغيلي" body="هذه الصفحة تقرأ onyx_snapshot_rows ولا تكتب إلى المنتجات أو العملاء أو المخزون المباشر." />
          <Insight icon={Zap} title="جودة المصدر" body={'Snapshot ' + selected.id.slice(0, 8) + ' — DQS ' + selected.data_quality_score + '/100. الأرقام محسوبة برمجيًا من الصفوف المنظمة.'} />
          <Insight icon={Activity} title="التنبؤ" body="Forecast Unavailable: Insufficient Historical Data. لقطة واحدة لا تكفي لإسناد تنبؤ زمني موثوق." />
        </div>
      </section>
      <section className="onyx-section">
        <div className="onyx-section-head"><div><span>مطابقة المخزون</span><h3>قارن هذا Snapshot مع المخزون المباشر</h3></div></div>
        <div className="action-card"><div className="action-card-icon"><AlertTriangle size={20} /></div><div><strong>مطابقة قراءة فقط</strong><p>يُنشأ سجل تدقيق دائم للفروقات. لا يتغير المخزون المباشر من هذه الخطوة.</p></div><Button disabled={reconciling || rowsLoading} onClick={() => void reconcileNow()}>{reconciling ? 'جارٍ تنفيذ المطابقة...' : 'مطابقة الآن'}</Button></div>
      </section>
      {rows?.length ? <section className="onyx-section panel"><div className="panel-head"><div><h3>عينة من صفوف اللقطة الثابتة</h3><p>عرض أول 50 صفًا فقط في الواجهة؛ بيانات المصدر محفوظة منفصلة.</p></div></div><TableWrap><table><thead><tr><th>رقم الصف</th><th>المفتاح القياسي</th><th>الحالة</th><th>بيانات الصف</th></tr></thead><tbody>{rows.slice(0,50).map((row) => <tr key={row.id}><td>{row.row_number}</td><td><code>{row.canonical_key ?? '—'}</code></td><td>{row.status}</td><td><code>{JSON.stringify(row.data).slice(0,220)}</code></td></tr>)}</tbody></table></TableWrap></section> : null}
    </>}
  </div>;
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
