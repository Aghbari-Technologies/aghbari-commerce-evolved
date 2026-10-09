import { Link } from '@tanstack/react-router';
import { ArrowRight, FileText, Package, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useFetch } from '@/lib/useFetch';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import type { Order, OrderItem } from '@/lib/types';
import { Login } from '@/components/Login';

export const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', pending: 'بانتظار المراجعة', confirmed: 'مؤكد', processing: 'قيد التجهيز',
  shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي',
};

const wrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '32px 20px 60px' };
const card: React.CSSProperties = { background: 'var(--card, #fff)', border: '1px solid #e0ecee', borderRadius: 16, padding: 20 };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront" dir="rtl" style={{ minHeight: '100vh' }}>
      <header className="sf-header"><div className="sf-header-inner">
        <Link to="/" className="sf-brand" style={{ textDecoration: 'none' }}><div className="sf-brand-icon"><Package size={22} /></div><div><strong>الأغبري</strong><span>حسابي التجاري</span></div></Link>
        <Link to="/" className="sf-admin-btn" style={{ textDecoration: 'none' }}><ArrowRight size={16} /> العودة للمتجر</Link>
      </div></header>
      <main style={wrap}>{children}</main>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Shell><p role="status">جارٍ التحميل...</p></Shell>;
  if (!user) return <Login />;
  return <>{children}</>;
}

export function MyOrders() {
  return <Gate><MyOrdersInner /></Gate>;
}

function MyOrdersInner() {
  const { data, loading, error, refetch } = useFetch(async () => {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw new Error('تعذر تحميل الطلبات');
    return data as Order[];
  });
  return (
    <Shell>
      <h1 style={{ fontSize: 26, margin: '0 0 6px' }}>طلباتي</h1>
      <p style={{ color: '#7a9398', margin: '0 0 20px' }}>كل الطلبات المرسلة من حسابك وحالتها الحالية</p>
      {loading && <p role="status">جارٍ تحميل الطلبات...</p>}
      {error && <div style={card} role="alert">{error} <button className="sf-link" onClick={refetch}>إعادة المحاولة</button></div>}
      {data && data.length === 0 && <div style={{ ...card, textAlign: 'center' }}><FileText size={32} /><p>لا توجد طلبات بعد.</p><Link to="/" className="sf-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', padding: '10px 18px' }}>ابدأ التسوق</Link></div>}
      {data && data.length > 0 && (
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f4f8f9', textAlign: 'right' }}><th style={{ padding: 12 }}>رقم الطلب</th><th>التاريخ</th><th>الأصناف</th><th>الإجمالي</th><th>الحالة</th><th /></tr></thead>
            <tbody>{data.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #edf2f3' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>{o.order_number}</td>
                <td>{formatDate(o.created_at)}</td>
                <td>{formatNumber(o.total_items)}</td>
                <td>{formatCurrency(o.total_amount)}</td>
                <td><span className="sf-detail-category">{STATUS_LABELS[o.status] ?? o.status}</span></td>
                <td><Link to="/orders/$id" params={{ id: o.id }} className="sf-link">التفاصيل</Link></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

export function OrderInvoice({ id }: { id: string }) {
  return <Gate><OrderInvoiceInner id={id} /></Gate>;
}

function OrderInvoiceInner({ id }: { id: string }) {
  const { user } = useAuth();
  const { data, loading, error } = useFetch(async () => {
    const [o, i, h] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', id),
      supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
    ]);
    if (o.error || i.error) throw new Error('تعذر تحميل الطلب');
    return { order: o.data as Order | null, items: (i.data ?? []) as OrderItem[], history: (h.data ?? []) as { id: string; to_status: string; created_at: string; notes: string | null }[] };
  }, [id]);

  if (loading) return <Shell><p role="status">جارٍ تحميل الطلب...</p></Shell>;
  if (error) return <Shell><div style={card} role="alert">{error}</div></Shell>;
  if (!data?.order) return <Shell><div style={card}>الطلب غير موجود أو لا تملك صلاحية عرضه. <Link to="/orders" className="sf-link">طلباتي</Link></div></Shell>;
  const { order, items, history } = data;

  return (
    <Shell>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/orders" className="sf-btn-secondary" style={{ textDecoration: 'none', padding: '10px 16px' }}>كل الطلبات</Link>
        <button className="sf-btn-primary" onClick={() => window.print()}><Printer size={16} /> طباعة / حفظ PDF</button>
      </div>
      <article style={card} className="print-area">
        <header style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '2px solid #0b97a5', paddingBottom: 14 }}>
          <div><h1 style={{ margin: 0, color: '#0b7b89', fontSize: 24 }}>الأغبري</h1><small>شركة الأغبري للمواد الغذائية — صنعاء، اليمن</small></div>
          <div style={{ textAlign: 'left' }}><strong>تأكيد طلب</strong><div>{order.order_number}</div><small>{formatDate(order.created_at)}</small></div>
        </header>
        <p style={{ margin: '14px 0' }}>العميل: <strong>{user?.name}</strong> — الحالة: <strong>{STATUS_LABELS[order.status] ?? order.status}</strong></p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f4f8f9', textAlign: 'right' }}><th style={{ padding: 8 }}>الصنف</th><th>الرمز</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
          <tbody>{items.map((it) => (
            <tr key={it.id} style={{ borderTop: '1px solid #edf2f3' }}><td style={{ padding: 8 }}>{it.product_name_snapshot}</td><td>{it.item_code}</td><td>{it.unit_snapshot}</td><td>{formatNumber(it.quantity)}</td><td>{formatCurrency(it.unit_price_snapshot)}</td><td>{formatCurrency(it.line_total)}</td></tr>
          ))}</tbody>
          <tfoot><tr style={{ borderTop: '2px solid #0b97a5' }}><td colSpan={5} style={{ padding: 10, fontWeight: 800 }}>الإجمالي</td><td style={{ fontWeight: 800 }}>{formatCurrency(order.total_amount)}</td></tr></tfoot>
        </table>
        {order.notes && <p style={{ marginTop: 14 }}>ملاحظات: {order.notes}</p>}
        {history.length > 0 && <section style={{ marginTop: 18 }}><h3 style={{ fontSize: 15 }}>مسار الطلب</h3><ol>{history.map((h) => <li key={h.id}>{STATUS_LABELS[h.to_status] ?? h.to_status} — {formatDate(h.created_at)}</li>)}</ol></section>}
      </article>
    </Shell>
  );
}
