import { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertTriangle, Bell, Bot, Check, ChevronLeft, Database,
  Package, Plus, RefreshCw, Search, Settings, Smartphone,
  X, ExternalLink,
} from 'lucide-react';
import {
  fetchAiAlerts, fetchAiTasks, fetchNotifications, fetchOrders, fetchOrderItems,
  fetchSettings, fetchSuppliers,
  markAllNotificationsRead, markNotificationRead, resolveAiAlert, toggleAiTaskStatus,
  updateOrderStatus, reviewOrderLines, updateSetting, createSupplier,
} from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCurrency, formatDateShort, formatNumber, timeAgo } from '@/lib/format';
import type { AiAlert, AiTask, Notification, Supplier, AdminSetting, OrderItem } from '@/lib/types';

import type { LucideIcon } from 'lucide-react';
import { supabase, ORG_ID } from '@/lib/supabase';
type IconType = LucideIcon;

export function Notifications({ onNotice }: { onNotice: (m: string) => void }) {
  const { data, loading, error, refetch } = useFetch(fetchNotifications);
  const unread = data?.filter((n) => !n.is_read).length ?? 0;
  async function readAll() { try { await markAllNotificationsRead(); refetch(); onNotice('تم تعليم الكل كمقروء'); } catch (e) { onNotice(e instanceof Error ? e.message : 'خطأ'); } }
  async function readOne(id: string) { try { await markNotificationRead(id); refetch(); } catch { /* ignore */ } }
  return <AdminPage eyebrow="النظام" title="التنبيهات" description="كل رسائل النظام والتنبيهات في مكان واحد" icon={Bell} note={`${data?.length ?? 0} تنبيه — ${unread} غير مقروء`} toolbar={<><Button variant="secondary" onClick={refetch}><RefreshCw size={16} /> تحديث</Button>{unread > 0 && <Button onClick={readAll}>تعليم الكل كمقروء</Button>}</>}>
    {loading ? <Loading /> : error ? <ErrorBox message={error} /> : <div className="notif-list">{data?.map((n: Notification) => <div className={`notif-row ${n.is_read ? 'read' : ''}`} key={n.id} onClick={() => !n.is_read && readOne(n.id)}><span className={`notif-type ${n.type}`}><Bell size={16} /></span><div><strong>{n.title}</strong><p>{n.body ?? '—'}</p><small>{timeAgo(n.created_at)}</small></div>{!n.is_read && <span className="notif-dot" />}</div>)}</div>}
  </AdminPage>;
}

export function AiCenter({ onNotice }: { onNotice: (m: string) => void }) {
  const { data: alerts, loading: aLoading, refetch: rAlerts } = useFetch(fetchAiAlerts);
  const { data: tasks, loading: tLoading, refetch: rTasks } = useFetch(fetchAiTasks);
  const [tab, setTab] = useState<'alerts' | 'tasks'>('alerts');
  async function resolve(id: string) { try { await resolveAiAlert(id); rAlerts(); onNotice('تم حل التنبيه'); } catch (e) { onNotice(e instanceof Error ? e.message : 'خطأ'); } }
  async function taskAction(id: string, status: string) { try { await toggleAiTaskStatus(id, status); rTasks(); onNotice(status === 'completed' ? 'تم إنجاز المهمة' : 'تم تحديث المهمة'); } catch (e) { onNotice(e instanceof Error ? e.message : 'خطأ'); } }
  return <AdminPage eyebrow="الذكاء الاصطناعي" title="مركز الذكاء" description="تنبيهات ومهام يولدها النظام تلقائياً" icon={Bot} note={`${alerts?.filter((a) => !a.is_resolved).length ?? 0} تنبيه نشط — ${tasks?.filter((t) => t.status !== 'completed').length ?? 0} مهمة معلقة`} toolbar={<Button variant="secondary" onClick={() => { rAlerts(); rTasks(); }}><RefreshCw size={16} /> تحديث</Button>}>
    <div className="ai-tabs"><button className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}><AlertTriangle size={16} /> التنبيهات</button><button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}><Check size={16} /> المهام</button></div>
    {tab === 'alerts' ? (aLoading ? <Loading /> : <div className="ai-alert-list">{alerts?.filter((a: AiAlert) => !a.is_resolved).map((a: AiAlert) => <div className="ai-alert-row" key={a.id}><span className={`ai-severity ${a.severity}`}><AlertTriangle size={18} /></span><div><strong>{a.title}</strong><p>{a.body ?? '—'}</p><small>{timeAgo(a.created_at)}</small></div><Button variant="outline" onClick={() => resolve(a.id)}>حل</Button></div>)}{!alerts?.filter((a) => !a.is_resolved).length && <Empty text="لا توجد تنبيهات نشطة" />}</div>) : (tLoading ? <Loading /> : <div className="ai-task-list">{tasks?.filter((t: AiTask) => t.status !== 'completed').map((t: AiTask) => <div className="ai-task-row" key={t.id}><span className={`ai-priority ${t.priority}`} /><div><strong>{t.title}</strong><p>{t.description ?? '—'}</p><small>{timeAgo(t.created_at)}</small></div><div className="ai-task-actions"><Button variant="outline" onClick={() => taskAction(t.id, 'in_progress')}>بدء</Button><Button onClick={() => taskAction(t.id, 'completed')}>إنجاز</Button></div></div>)}{!tasks?.filter((t) => t.status !== 'completed').length && <Empty text="لا توجد مهام معلقة" />}</div>)}
  </AdminPage>;
}

type OrderReviewDraft = { quantity: string; unitPrice: string; reason: string };

export function OrderDetail({ orderId, onBack, onNotice }: { orderId: string; onBack: () => void; onNotice: (m: string) => void }) {
  const { data: orders, refetch: refetchOrders } = useFetch(fetchOrders);
  const { data: items, loading, error, refetch } = useFetch(() => fetchOrderItems(orderId), [orderId]);
  const order = orders?.find((o) => o.id === orderId);
  const [drafts, setDrafts] = useState<Record<string, OrderReviewDraft>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customerNote, setCustomerNote] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const quantityInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!items) return;
    const next: Record<string, OrderReviewDraft> = {};
    for (const item of items) {
      next[item.id] = {
        quantity: String(item.proposed_quantity ?? item.approved_quantity ?? item.quantity),
        unitPrice: String(item.proposed_unit_price ?? item.approved_unit_price ?? item.unit_price_snapshot),
        reason: item.proposed_price_reason ?? item.price_override_reason ?? '',
      };
    }
    setDrafts(next);
    setDirty(false);
  }, [items]);

  const editable = order?.status === 'pending' || order?.status === 'draft';
  const hasStaged = Boolean(order?.quantity_review_required) || Boolean(items?.some((item) =>
    item.proposed_quantity != null || item.proposed_unit_price != null,
  ));
  const blocked = dirty || hasStaged;
  const transitions: Record<string, string[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['cancelled'],
    confirmed: ['processing', 'shipped', 'delivered', 'cancelled'],
    processing: ['shipped', 'delivered', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };
  const statuses = transitions[order?.status ?? 'pending'] ?? [];
  const projectedTotal = (items ?? []).reduce((sum, item) => {
    const draft = drafts[item.id];
    const quantity = Number(draft?.quantity ?? item.quantity);
    const unitPrice = Number(draft?.unitPrice ?? item.unit_price_snapshot);
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0);
  }, 0);

  function payload() {
    return (items ?? []).map((item) => ({
      item_id: item.id,
      quantity: Number(drafts[item.id]?.quantity ?? item.proposed_quantity ?? item.approved_quantity ?? item.quantity),
      unit_price: Number(drafts[item.id]?.unitPrice ?? item.proposed_unit_price ?? item.approved_unit_price ?? item.unit_price_snapshot),
      price_reason: (drafts[item.id]?.reason ?? item.proposed_price_reason ?? item.price_override_reason ?? '').trim() || null,
    }));
  }

  async function changeStatus(status: string) {
    if (blocked) {
      setReviewMessage('لا يمكن مغادرة مراجعة الطلب أو تغيير حالته قبل اعتماد الكميات والأسعار أو إلغاء المسودة.');
      return;
    }
    setBusy(true);
    try {
      await updateOrderStatus(orderId, status);
      await Promise.all([refetch(), refetchOrders()]);
      onNotice('تم تحديث حالة الطلب إلى: ' + status);
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'تعذر تحديث حالة الطلب');
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(itemId: string, patch: Partial<OrderReviewDraft>) {
    setDrafts((previous) => ({ ...previous, [itemId]: { ...previous[itemId], ...patch } }));
    setDirty(true);
    setReviewMessage('توجد تعديلات لم تُحفظ بعد. اعتمدها أو ألغها قبل مغادرة القسم.');
  }

  function enterNext(event: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const next = items?.[index + 1];
    if (next) quantityInputs.current[next.id]?.focus();
    else setReviewMessage('وصلت إلى آخر بند. احفظ المسودة ثم نفّذ اعتماد الكميات لتأكيد الطلب.');
  }

  async function stageReview() {
    if (!items?.length || busy) return;
    const lines = payload();
    if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 10000 ||
      !Number.isFinite(line.unit_price) || line.unit_price < 0 ||
      !Number.isInteger(Math.round(line.quantity * 1000)))) {
      setReviewMessage('تحقق من أن كل كمية بين 0.001 و10,000 وأن الأسعار أرقام غير سالبة.');
      return;
    }
    if (lines.some((line) => {
      const current = items.find((item) => item.id === line.item_id);
      return current && line.unit_price !== Number(current.unit_price_snapshot) && !line.price_reason;
    })) {
      setReviewMessage('سبب تعديل السعر مطلوب لكل بند تغير سعره. تعديل طلب واحد لا يغيّر سعر الكتالوج.');
      return;
    }
    setBusy(true);
    setReviewMessage('');
    try {
      const result = await reviewOrderLines(orderId, lines, 'stage', customerNote);
      await Promise.all([refetch(), refetchOrders()]);
      setDirty(false);
      setReviewMessage(result.quantity_review_required
        ? 'حُفظت مسودة التعديلات في الخادم. ما تزال غير معتمدة؛ لا يمكن تأكيد الطلب أو مغادرة هذه المراجعة.'
        : 'حُفظت المسودة؛ راجع جميع البنود ثم أكد الطلب عند الجاهزية.');
      onNotice('تم حفظ مسودة مراجعة الطلب دون تعديل المخزون أو إصدار فاتورة.');
    } catch (cause) {
      setReviewMessage(cause instanceof Error ? cause.message : 'تعذر حفظ مسودة المراجعة');
    } finally {
      setBusy(false);
    }
  }

  async function approveReview() {
    if (!items?.length || busy) return;
    const lines = payload();
    if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 10000 ||
      !Number.isFinite(line.unit_price) || line.unit_price < 0)) {
      setReviewMessage('تحقق من صحة جميع الكميات والأسعار قبل الاعتماد.');
      return;
    }
    if (lines.some((line) => {
      const current = items.find((item) => item.id === line.item_id);
      return current && line.unit_price !== Number(current.unit_price_snapshot) && !line.price_reason;
    })) {
      setReviewMessage('أضف سببًا لكل تعديل سعر قبل الاعتماد.');
      return;
    }
    setBusy(true);
    setReviewMessage('');
    try {
      // If the visible grid differs from a previously staged draft, persist this exact full grid first.
      // Confirmation itself remains a separate atomic server operation that checks inventory, credit,
      // creates the invoice and raises the payment request in the same transaction.
      if (dirty || !hasStaged) {
        await reviewOrderLines(orderId, lines, 'stage', customerNote);
      }
      const result = await reviewOrderLines(orderId, lines, 'approve', customerNote);
      await Promise.all([refetch(), refetchOrders()]);
      setDirty(false);
      setReviewMessage(result.adjusted
        ? 'اعتمدت التعديلات، تأكد الطلب، أُنشئت الفاتورة من الخادم، وسُجل طلب السداد للعميل.'
        : 'اعتمدت الكميات وأُكد الطلب. أُنشئت الفاتورة وطلب السداد من الخادم.');
      onNotice('تم اعتماد الطلب ذريًا. حالة طلب السداد: ' + (result.payment_request_status ?? 'requested'));
    } catch (cause) {
      await Promise.all([refetch(), refetchOrders()]);
      setReviewMessage(cause instanceof Error ? cause.message : 'تعذر اعتماد الطلب؛ بقي الطلب دون تأكيد إذا رفض الخادم العملية.');
    } finally {
      setBusy(false);
    }
  }

  async function discardReview() {
    if (busy) return;
    setBusy(true);
    try {
      if (hasStaged && editable) await reviewOrderLines(orderId, [], 'discard');
      if (items) {
        const next: Record<string, OrderReviewDraft> = {};
        for (const item of items) next[item.id] = {
          quantity: String(item.approved_quantity ?? item.quantity),
          unitPrice: String(item.approved_unit_price ?? item.unit_price_snapshot),
          reason: item.price_override_reason ?? '',
        };
        setDrafts(next);
      }
      setDirty(false);
      await Promise.all([refetch(), refetchOrders()]);
      setReviewMessage('أُلغيت المسودة غير المعتمدة. لم يتغير المخزون ولم تصدر فاتورة من هذه المسودة.');
    } catch (cause) {
      setReviewMessage(cause instanceof Error ? cause.message : 'تعذر إلغاء المسودة');
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (blocked) {
      setReviewMessage('أكمل الاعتماد أو ألغ المسودة قبل مغادرة مراجعة الطلب.');
      return;
    }
    onBack();
  }

  return <AdminPage eyebrow="المبيعات والعملاء" title={'الطلب #' + (order?.order_number ?? '')}
    description="راجع البنود والكميات والأسعار، ثم احفظ المسودة واعتمدها في معاملة واحدة قبل تأكيد الطلب."
    icon={Package} note="" toolbar={<Button variant="secondary" onClick={goBack} disabled={blocked || busy}><ChevronLeft size={16} /> رجوع</Button>}>
    {order && <div className="order-detail-grid">
      <div className="order-info-panel">
        <div className="order-info-row"><span>العميل</span><strong>{order.customer?.business_name ?? '—'}</strong></div>
        <div className="order-info-row"><span>التاريخ</span><strong>{formatDateShort(order.created_at)}</strong></div>
        <div className="order-info-row"><span>الإجمالي المقترح</span><strong>{formatCurrency(projectedTotal)}</strong></div>
        <div className="order-info-row"><span>عدد البنود</span><strong>{formatNumber(order.total_items)}</strong></div>
        <div className="order-info-row"><span>الحالة الحالية</span><span className={'badge ' + (order.status === 'confirmed' ? 'success' : 'info')}>{order.status}</span></div>
        <div className="order-info-row"><span>طلب السداد</span><strong>{order.payment_request_status === 'requested' ? 'مطلوب من العميل' : order.payment_request_status ?? 'غير مطلوب'}</strong></div>
      </div>
      <div className="order-status-panel">
        <h3>تغيير الحالة</h3>
        <p>تأكيد الطلب يصدر الفاتورة ويطلب السداد. استخدم الاعتماد أدناه حتى تمر الكميات والأسعار عبر مسار المراجعة المحكوم.</p>
        <div className="order-status-btns">{statuses.map((status) =>
          <button key={status} disabled={busy || blocked} className={order.status === status ? 'active' : ''} onClick={() => void changeStatus(status)}>
            {({ pending: 'بانتظار المراجعة', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'إلغاء الطلب' } as Record<string, string>)[status] ?? status}
          </button>,
        )}</div>
      </div>
    </div>}

    {editable && <section className="panel table-panel" style={{ marginTop: 16 }}>
      <div className="panel-head"><div><h2>مراجعة بنود الطلب</h2><p>Enter ينتقل إلى كمية السطر التالي. اللون الأزرق الفاتح يميز الحقول القابلة للتعديل. أي تغيير يبقى غير معتمد حتى تنفيذ الاعتماد.</p></div>
        <span className={'badge ' + (blocked ? 'warning' : 'success')}>{blocked ? 'مراجعة غير معتمدة' : 'جاهز للمراجعة'}</span>
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : !items?.length ? <Empty text="لا توجد بنود يمكن مراجعتها." /> :
        <TableWrap><table><thead><tr><th>المنتج / SKU</th><th>الكمية المطلوبة</th><th>الكمية المقترحة/المعتمدة</th><th>السعر للوحدة</th><th>سبب تعديل السعر</th><th>الإجمالي المقترح</th></tr></thead><tbody>
          {items.map((item, index) => {
            const draft = drafts[item.id] ?? { quantity: String(item.quantity), unitPrice: String(item.unit_price_snapshot), reason: '' };
            const quantity = Number(draft.quantity);
            const price = Number(draft.unitPrice);
            const valid = Number.isFinite(quantity) && quantity > 0 && quantity <= 10000 && Number.isFinite(price) && price >= 0;
            return <tr key={item.id}>
              <td><strong>{item.product_name_snapshot}</strong><small style={{ display: 'block' }}><code>{item.item_code}</code> · {item.unit_snapshot ?? ''}</small></td>
              <td>{formatNumber(Number(item.requested_quantity ?? item.quantity))}</td>
              <td><input
                ref={(element) => { quantityInputs.current[item.id] = element; }}
                aria-label={'الكمية المقترحة ' + item.product_name_snapshot}
                type="number" min="0.001" max="10000" step="0.001"
                value={draft.quantity}
                disabled={busy}
                onChange={(event) => updateDraft(item.id, { quantity: event.target.value })}
                onKeyDown={(event) => enterNext(event, index)}
                style={{ width: 130, padding: '8px 10px', border: '1px solid #b8d7f3', borderRadius: 8, background: '#eef7ff', color: '#193b56' }}
              /></td>
              <td><input
                aria-label={'السعر المقترح ' + item.product_name_snapshot}
                type="number" min="0" max="999999999999" step="0.01"
                value={draft.unitPrice}
                disabled={busy}
                onChange={(event) => updateDraft(item.id, { unitPrice: event.target.value })}
                style={{ width: 130, padding: '8px 10px', border: '1px solid #b8d7f3', borderRadius: 8, background: '#eef7ff', color: '#193b56' }}
              /></td>
              <td><input
                aria-label={'سبب تعديل السعر ' + item.product_name_snapshot}
                value={draft.reason}
                disabled={busy}
                maxLength={500}
                onChange={(event) => updateDraft(item.id, { reason: event.target.value })}
                placeholder="مطلوب إذا تغير السعر"
                style={{ width: 180, padding: '8px 10px', border: '1px solid #d9e5eb', borderRadius: 8, background: '#fff' }}
              /></td>
              <td>{valid ? formatCurrency(quantity * price) : '—'}</td>
            </tr>;
          })}
        </tbody></table></TableWrap>}
      <label className="form-field" style={{ marginTop: 12 }}><span>ملاحظة للعميل (اختيارية)</span><textarea value={customerNote} onChange={(event) => { setCustomerNote(event.target.value); setDirty(true); }} maxLength={1000} rows={2} placeholder="توضيح أي تغيير في الأصناف أو الكميات" /></label>
      {reviewMessage && <div className={blocked ? 'form-error' : 'privacy-note'} role={blocked ? 'alert' : 'status'}>{reviewMessage}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <Button variant="secondary" disabled={busy || loading || !items?.length} onClick={() => void stageReview()}>{busy ? 'جارٍ الحفظ...' : 'حفظ المسودة دون اعتماد'}</Button>
        <Button disabled={busy || loading || !items?.length} onClick={() => void approveReview()}>{busy ? 'جارٍ الاعتماد...' : 'اعتماد الكميات وتأكيد الطلب'}</Button>
        {(blocked || dirty) && <Button variant="outline" disabled={busy} onClick={() => void discardReview()}>إلغاء المسودة</Button>}
      </div>
      {blocked && <p role="alert" style={{ color: '#9a5b13', fontWeight: 800, marginTop: 12 }}>لا يمكن مغادرة هذا القسم أو تغيير حالة الطلب قبل اعتماد الكميات/الأسعار المقترحة أو إلغاء المسودة.</p>}
    </section>}

    {!editable && items && <section className="panel table-panel" style={{ marginTop: 16 }}>
      <div className="panel-head"><div><h2>البنود المعتمدة</h2><p>الأسعار للعرض الداخلي للموظفين المخولين فقط.</p></div></div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> : <TableWrap><table><thead><tr><th>المنتج</th><th>الرمز</th><th>الكمية المعتمدة</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>{items.map((item: OrderItem) => <tr key={item.id}>
        <td><strong>{item.product_name_snapshot}</strong></td><td><code>{item.item_code}</code></td><td>{formatNumber(Number(item.approved_quantity ?? item.quantity))} {item.unit_snapshot ?? ''}</td><td>{formatCurrency(Number(item.approved_unit_price ?? item.unit_price_snapshot))}</td><td>{formatCurrency(Number(item.line_total))}</td>
      </tr>)}</tbody></table></TableWrap>}
      {order.quantity_review_required && <p role="alert" style={{ color: '#9a5b13', fontWeight: 800 }}>توجد مراجعة معلقة. يجب إكمالها قبل متابعة الطلب.</p>}
      {order.customer_adjustment_note && <p>{order.customer_adjustment_note}</p>}
    </section>}
  </AdminPage>;
}

export function Suppliers({ onNotice }: { onNotice: (m: string) => void }) {
  const { data, loading, error, refetch } = useFetch(fetchSuppliers);
  const [modal, setModal] = useState(false);
  return <AdminPage eyebrow="إدارة البيانات" title="الموردون" description="إدارة دليل الموردين وجهات الاتصال" icon={Package} note={`${data?.length ?? 0} مورد`} toolbar={<><Button variant="secondary" onClick={refetch}><RefreshCw size={16} /> تحديث</Button><Button onClick={() => setModal(true)}><Plus size={17} /> إضافة مورد</Button></>}>
    {loading ? <Loading /> : error ? <ErrorBox message={error} /> : <TableWrap><table><thead><tr><th>المورد</th><th>جهة الاتصال</th><th>الهاتف</th><th>البريد</th><th>الحالة</th></tr></thead><tbody>{data?.map((s: Supplier) => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.supplier_code}</small></td><td>{s.contact_name ?? '—'}</td><td>{s.phone ?? '—'}</td><td>{s.email ?? '—'}</td><td><span className={`badge ${s.status === 'active' ? 'success' : 'warning'}`}>{s.status}</span></td></tr>)}</tbody></table></TableWrap>}
    {modal && <SupplierModal onClose={() => setModal(false)} onSaved={() => { setModal(false); refetch(); onNotice('تمت إضافة المورد'); }} />}
  </AdminPage>;
}
function SupplierModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(''); const [contact, setContact] = useState(''); const [phone, setPhone] = useState(''); const [error, setError] = useState('');
  async function save() { if (!name.trim()) { setError('اسم المورد مطلوب'); return; } try { await createSupplier({ name, contact_name: contact, phone, supplier_code: `SUP-${Date.now().toString().slice(-5)}`, status: 'active' }); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : 'خطأ'); } }
  return <Modal title="إضافة مورد" onClose={onClose}><Field label="اسم المورد"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><div className="form-grid"><Field label="جهة الاتصال"><input value={contact} onChange={(e) => setContact(e.target.value)} /></Field><Field label="الهاتف"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><Button variant="outline" onClick={onClose}>إلغاء</Button><Button onClick={save}>حفظ</Button></div></Modal>;
}

export function Devices({ onNotice }: { onNotice: (m: string) => void }) {
  const { data: customers } = useFetch(async () => { const { data } = await supabase.from('customers').select('*').eq('organization_id', ORG_ID).order('created_at', { ascending: false }); return data ?? []; });
  const [query, setQuery] = useState('');
  const rows = (customers ?? []).filter((c: { business_name: string; customer_code: string; phone: string | null }) => `${c.business_name} ${c.customer_code} ${c.phone ?? ''}`.includes(query));
  return <AdminPage eyebrow="المبيعات والعملاء" title="أجهزة العملاء" description="متابعة أجهزة البيع لدى العملاء" icon={Smartphone} note={`${customers?.length ?? 0} جهاز مسجل`} toolbar={<Button variant="secondary" onClick={() => onNotice('تم تحديث الحالة')}><RefreshCw size={16} /> تحديث</Button>}>
    <div className="table-head"><h2>قائمة الأجهزة</h2><label className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث..." /></label></div>
    <TableWrap><table><thead><tr><th>العميل</th><th>الكود</th><th>الهاتف</th><th>الحالة</th><th /></tr></thead><tbody>{rows.map((c: { id: string; business_name: string; customer_code: string; phone: string | null; status: string }) => <tr key={c.id}><td><strong>{c.business_name}</strong></td><td><code>{c.customer_code}</code></td><td>{c.phone ?? '—'}</td><td><span className={`badge ${c.status === 'approved' ? 'success' : 'warning'}`}>{c.status}</span></td><td><button className="row-action"><ExternalLink size={15} /></button></td></tr>)}</tbody></table></TableWrap>
  </AdminPage>;
}

export function SettingsPage({ onNotice }: { onNotice: (m: string) => void }) {
  const { data: settings, loading, refetch } = useFetch(fetchSettings);
  const [tab, setTab] = useState<'general' | 'storefront' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);
  const map = useMemo(() => { const m: Record<string, unknown> = {}; settings?.forEach((s: AdminSetting) => m[s.key] = s.value); return m; }, [settings]);

  async function save(key: string, value: unknown, category: string) { setSaving(true); try { await updateSetting(key, value, category); refetch(); onNotice('تم حفظ الإعداد'); } catch (e) { onNotice(e instanceof Error ? e.message : 'خطأ'); } finally { setSaving(false); } }

  return <AdminPage eyebrow="النظام" title="الإعدادات العامة" description="تحكم كامل في إعدادات المتجر والمظهر" icon={Settings} note="" toolbar={<Button variant="secondary" onClick={refetch}><RefreshCw size={16} /> تحديث</Button>}>
    {loading ? <Loading /> : <>
      <div className="settings-tabs"><button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>عام</button><button className={tab === 'storefront' ? 'active' : ''} onClick={() => setTab('storefront')}>المتجر</button><button className={tab === 'appearance' ? 'active' : ''} onClick={() => setTab('appearance')}>المظهر</button></div>
      {tab === 'general' && <SettingsPanel title="معلومات المتجر"><SettingInput label="اسم المتجر" value={(map.store_name as string) ?? ''} onSave={(v) => save('store_name', v, 'general')} saving={saving} /><SettingInput label="الوصف المختصر" value={(map.store_tagline as string) ?? ''} onSave={(v) => save('store_tagline', v, 'general')} saving={saving} /><SettingInput label="الهاتف" value={(map.store_phone as string) ?? ''} onSave={(v) => save('store_phone', v, 'general')} saving={saving} /><SettingInput label="البريد" value={(map.store_email as string) ?? ''} onSave={(v) => save('store_email', v, 'general')} saving={saving} /><SettingInput label="العنوان" value={(map.store_address as string) ?? ''} onSave={(v) => save('store_address', v, 'general')} saving={saving} /></SettingsPanel>}
      {tab === 'storefront' && <SettingsPanel title="إعدادات المتجر"><SettingInput label="عنوان البانر" value={(map.hero_title as string) ?? ''} onSave={(v) => save('hero_title', v, 'storefront')} saving={saving} /><SettingInput label="نص البانر الفرعي" value={(map.hero_subtitle as string) ?? ''} onSave={(v) => save('hero_subtitle', v, 'storefront')} saving={saving} /><SettingToggle label="شريط العرض المتحرك" value={(map.ticker_enabled as boolean) ?? true} onSave={(v) => save('ticker_enabled', v, 'storefront')} saving={saving} /><SettingToggle label="إظهار المنتجات النافدة" value={(map.show_out_of_stock as boolean) ?? true} onSave={(v) => save('show_out_of_stock', v, 'storefront')} saving={saving} /></SettingsPanel>}
      {tab === 'appearance' && <SettingsPanel title="ألوان النظام"><SettingColor label="اللون الأساسي" value={(map.theme_primary as string) ?? '#087f8d'} onSave={(v) => save('theme_primary', v, 'appearance')} saving={saving} /><SettingColor label="لون التمييز" value={(map.theme_accent as string) ?? '#0eaa97'} onSave={(v) => save('theme_accent', v, 'appearance')} saving={saving} /></SettingsPanel>}
    </>}
  </AdminPage>;
}

function SettingsPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="panel settings-panel"><div className="panel-head"><div><h2>{title}</h2></div></div><div className="settings-body">{children}</div></section>; }
function SettingInput({ label, value, onSave, saving }: { label: string; value: string; onSave: (v: string) => void; saving: boolean }) { const [v, setV] = useState(value); useEffect(() => setV(value), [value]); return <div className="setting-row"><label><span>{label}</span><input value={v} onChange={(e) => setV(e.target.value)} /></label><Button variant="outline" onClick={() => onSave(v)} disabled={saving}>حفظ</Button></div>; }
function SettingToggle({ label, value, onSave, saving }: { label: string; value: boolean; onSave: (v: boolean) => void; saving: boolean }) { return <div className="setting-row"><div className="setting-label"><span>{label}</span><label className="switch"><input type="checkbox" checked={value} onChange={(e) => onSave(e.target.checked)} disabled={saving} /><span /></label></div></div>; }
function SettingColor({ label, value, onSave, saving }: { label: string; value: string; onSave: (v: string) => void; saving: boolean }) { return <div className="setting-row"><label><span>{label}</span><input type="color" value={value} onChange={(e) => onSave(e.target.value)} disabled={saving} /></label></div>; }

// ─── Shared components ───
export function AdminPage({ eyebrow, title, description, icon: Icon, note, toolbar, children }: { eyebrow: string; title: string; description: string; icon: IconType; note: string; toolbar?: React.ReactNode; children: React.ReactNode }) {
  return <><div className="heading"><div className="heading-icon"><Icon size={25} /></div><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></div>{(note || toolbar) && <div className="toolbar"><span className="toolbar-note">{note}</span><div className="toolbar-actions">{toolbar}</div></div>}{children}</>;
}
export function Loading() { return <div className="loading"><RefreshCw size={20} className="spin" /> جار تحميل البيانات...</div>; }
export function ErrorBox({ message }: { message: string }) { return <div className="error-box"><AlertTriangle size={19} /> تعذر تحميل البيانات. {message}</div>; }
export function Empty({ text }: { text: string }) { return <div className="empty"><Database size={26} /><span>{text}</span></div>; }
export function Button({ children, variant = 'primary', onClick, disabled }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'outline' | 'danger'; onClick?: () => void; disabled?: boolean }) { return <button className={`btn ${variant}`} onClick={onClick} disabled={disabled}>{children}</button>; }
export function TableWrap({ children }: { children: React.ReactNode }) { return <div className="table-wrap">{children}</div>; }
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose}><X size={19} /></button></div>{children}</div></div>; }
