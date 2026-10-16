import { Link } from "@tanstack/react-router";
import { ArrowLeft, Boxes, CalendarDays, RefreshCw, Tag } from "lucide-react";
import { fetchCategories, fetchPromotions } from "@/lib/api";
import { formatDateShort } from "@/lib/format";
import type { Category, Promotion } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

const shell = { maxWidth: 1120, margin: "0 auto", padding: "24px 16px", color: "#173b3d" } as const;
const panel = { border: "1px solid #dce8e8", borderRadius: 16, background: "#fff", padding: 18 } as const;
const linkStyle = { display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", borderRadius: 10, padding: "9px 12px", background: "#edf7f7", color: "#075d64", fontWeight: 800, fontSize: 13 } as const;

function routeKey(category: Category): string {
  return category.code?.trim() || category.id;
}

function CategoryCard({ category, childrenCount }: { category: Category; childrenCount: number }) {
  return (
    <article style={panel}>
      <Boxes size={22} aria-hidden="true" />
      <h2 style={{ margin: "10px 0 4px", fontSize: 18 }}>{category.name}</h2>
      <p style={{ margin: "0 0 14px", color: "#61787a", fontSize: 13 }}>
        {childrenCount ? `التصنيفات الفرعية: ${childrenCount}` : "عرض المنتجات التابعة لهذا التصنيف"}
      </p>
      <Link to={("/category/" + encodeURIComponent(routeKey(category))) as never} style={linkStyle}>
        عرض المنتجات <ArrowLeft size={15} aria-hidden="true" />
      </Link>
      {childrenCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <span style={{ color: "#61787a", fontSize: 12 }}>تصنيفات فرعية متاحة:</span>
          <span style={{ color: "#61787a", fontSize: 12 }}>{childrenCount}</span>
        </div>
      )}
    </article>
  );
}

export function CustomerCategoriesPage() {
  const { data, loading, error, refetch } = useFetch(fetchCategories);
  const categories = (data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ar"));
  const parents = categories.filter((category) => !category.parent_id);
  const childCount = new Map<string, number>();
  for (const category of categories) {
    if (category.parent_id) childCount.set(category.parent_id, (childCount.get(category.parent_id) ?? 0) + 1);
  }

  return (
    <main dir="rtl" className="storefront" style={shell}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, color: "#0b7b83", fontWeight: 800, fontSize: 12 }}>اكتشاف الكتالوج</p>
          <h1 style={{ margin: "6px 0", fontSize: 28 }}>التصنيفات</h1>
          <p style={{ margin: 0, color: "#61787a" }}>تصنيفات منشورة من خدمة المتجر، دون إنشاء تصنيفات افتراضية.</p>
        </div>
        <Link to="/catalog" style={linkStyle}>الكتالوج الكامل <ArrowLeft size={15} aria-hidden="true" /></Link>
      </header>
      {loading && <p role="status" style={panel}>جار تحميل التصنيفات من الخادم...</p>}
      {error && <section role="alert" style={panel}><strong>تعذر تحميل التصنيفات</strong><p>{error}</p><button type="button" onClick={() => void refetch()} disabled={loading}><RefreshCw size={14} /> إعادة المحاولة</button></section>}
      {!loading && !error && parents.length === 0 && <section role="status" style={panel}>لا توجد تصنيفات نشطة متاحة للعرض حاليًا.</section>}
      {!loading && !error && parents.length > 0 && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          {parents.map((category) => <CategoryCard key={category.id} category={category} childrenCount={childCount.get(category.id) ?? 0} />)}
        </section>
      )}
    </main>
  );
}

function isCurrentPromotion(promotion: Promotion, now: number): boolean {
  if (!promotion.is_active) return false;
  const start = Date.parse(promotion.start_date);
  const end = Date.parse(promotion.end_date);
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && end >= now;
}

export function CustomerOffersPage() {
  const { data, loading, error, refetch } = useFetch(fetchPromotions);
  const now = Date.now();
  const current = (data ?? []).filter((promotion) => isCurrentPromotion(promotion, now));
  return (
    <main dir="rtl" className="storefront" style={shell}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, color: "#0b7b83", fontWeight: 800, fontSize: 12 }}>العروض المنشورة</p>
          <h1 style={{ margin: "6px 0", fontSize: 28 }}>العروض الحالية</h1>
          <p style={{ margin: 0, color: "#61787a" }}>يعرض هذا القسم العروض المفعّلة التي تقع ضمن فترة صلاحيتها المسجلة.</p>
        </div>
        <Link to="/catalog" style={linkStyle}>تصفح المنتجات <ArrowLeft size={15} aria-hidden="true" /></Link>
      </header>
      {loading && <p role="status" style={panel}>جار تحميل العروض...</p>}
      {error && <section role="alert" style={panel}><strong>تعذر تحميل العروض</strong><p>{error}</p><button type="button" onClick={() => void refetch()} disabled={loading}><RefreshCw size={14} /> إعادة المحاولة</button></section>}
      {!loading && !error && current.length === 0 && <section role="status" style={panel}>لا توجد عروض مفعّلة ضمن فترة صلاحيتها الآن.</section>}
      {!loading && !error && current.length > 0 && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {current.map((promotion) => (
            <article key={promotion.id} style={panel}>
              <Tag size={23} aria-hidden="true" />
              <h2 style={{ margin: "10px 0 6px", fontSize: 18 }}>{promotion.title}</h2>
              {promotion.description && <p style={{ color: "#526c70", lineHeight: 1.7 }}>{promotion.description}</p>}
              <p style={{ margin: "8px 0", fontWeight: 800 }}>{promotion.discount_value}{promotion.discount_type.toLowerCase().includes("percent") || promotion.discount_type.toLowerCase().includes("percentage") ? "%" : ""} <span style={{ fontWeight: 500, color: "#61787a" }}>{promotion.discount_type}</span></p>
              <p style={{ display: "flex", alignItems: "center", gap: 7, color: "#61787a", fontSize: 12 }}><CalendarDays size={14} aria-hidden="true" /> {formatDateShort(promotion.start_date)} – {formatDateShort(promotion.end_date)}</p>
              <Link to="/catalog" style={linkStyle}>عرض الكتالوج <ArrowLeft size={15} aria-hidden="true" /></Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
