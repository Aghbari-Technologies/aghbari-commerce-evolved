import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Boxes, Search, Tag } from "lucide-react";
import { fetchCategories, fetchPopularProductRanking, fetchProducts, fetchPromotions, type PopularProductRanking } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { formatCurrency, formatNumber } from "@/lib/format";
import { matchesArabicCatalogSearch } from "@/lib/commerce-utils";
import type { Category, ProductWithInventory, Promotion } from "@/lib/types";

export type CustomerDiscoveryMode = "categories" | "collections" | "featured" | "offers" | "collection" | "advanced-search";
const shell: CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "28px 20px 64px", color: "var(--foreground, #183b3c)" };
const panel: CSSProperties = { border: "1px solid var(--border, #dce8e6)", borderRadius: 16, padding: 18, background: "var(--card, #fff)" };
const quiet: CSSProperties = { color: "var(--muted-foreground, #637b7b)", lineHeight: 1.8 };
const control: CSSProperties = { width: "100%", minHeight: 42, padding: "9px 11px", border: "1px solid var(--border, #dce8e6)", borderRadius: 9, background: "var(--background, #fff)", color: "inherit" };

function slug(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ar").replace(/[\s_]+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function matchesSlug(category: Category, value: string): boolean {
  if (category.id === value || category.code === value) return true;
  const normalized = slug(value);
  return [category.name, category.code ?? "", category.id].some((key) => slug(key) === normalized);
}

export function CustomerDiscoveryPage({ mode, slugKey }: { mode: CustomerDiscoveryMode; slugKey?: string }) {
  const { data: products, loading: productLoading, error: productError, refetch: retryProducts } = useFetch(fetchProducts);
  const { data: categories, loading: categoryLoading, error: categoryError, refetch: retryCategories } = useFetch(fetchCategories);
  const { data: promotions, loading: promotionLoading, error: promotionError, refetch: retryPromotions } = useFetch(fetchPromotions);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<"source" | "name" | "newest" | "stock">("source");

  const matchedCategory = useMemo(() => (categories ?? []).find((row) => matchesSlug(row, slugKey ?? "")) ?? null, [categories, slugKey]);
  const results = useMemo(() => {
    let rows = [...(products ?? [])];
    if (mode === "collection") {
      if (!matchedCategory) return [];
      rows = rows.filter((row) => row.category_id === matchedCategory.id);
    }
    if (mode === "advanced-search") {
      if (query.trim()) rows = rows.filter((row) => matchesArabicCatalogSearch(row, query.trim()));
      if (categoryId) rows = rows.filter((row) => row.category_id === categoryId);
      if (availableOnly) rows = rows.filter((row) => (row.inventory?.quantity_available ?? 0) > 0);
      if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      if (sort === "newest") rows.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
      if (sort === "stock") rows.sort((a, b) => (b.inventory?.quantity_available ?? 0) - (a.inventory?.quantity_available ?? 0));
    }
    return rows;
  }, [products, mode, matchedCategory, query, categoryId, availableOnly, sort]);
  const liveOffers = useMemo(() => {
    const now = Date.now();
    return (promotions ?? []).filter((p) => p.is_active
      && (!Number.isFinite(Date.parse(p.start_date)) || Date.parse(p.start_date) <= now)
      && (!Number.isFinite(Date.parse(p.end_date)) || Date.parse(p.end_date) >= now));
  }, [promotions]);
  const title = mode === "categories" ? "تصنيفات المنتجات"
    : mode === "collections" ? "مجموعات التصفح"
    : mode === "featured" ? "المنتجات المميزة"
    : mode === "offers" ? "العروض الحالية"
    : mode === "collection" ? (matchedCategory?.name ?? "مجموعة المنتجات")
    : "البحث المتقدم";

  return <main dir="rtl" className="storefront" style={shell}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 22 }}>
      <div><p style={{ margin: "0 0 4px", ...quiet }}>الأغبري · كتالوج مبني على بيانات الخادم</p><h1 style={{ margin: 0, fontSize: 30 }}>{title}</h1></div>
      <nav aria-label="روابط الكتالوج" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><Link to="/catalog">الكتالوج</Link><Link to="/categories">التصنيفات</Link><Link to="/search/advanced">بحث متقدم</Link><Link to="/cart">السلة</Link></nav>
    </header>

    {(mode === "categories" || mode === "collections") && <>
      {mode === "collections" && <div style={panel} role="status"><strong>حدود مصدر البيانات:</strong><p style={{ ...quiet, marginBottom: 0 }}>لا يوجد عقد مستقل للمجموعات التسويقية في طبقة البيانات الحالية. تعرض هذه الشاشة التصنيفات الحقيقية القابلة للتصفح ولا تنشئ مجموعات افتراضية.</p></div>}
      {categoryLoading && <p role="status">جارٍ تحميل التصنيفات...</p>}
      {categoryError && <div style={panel} role="alert">تعذر تحميل التصنيفات: {categoryError.message} <button type="button" onClick={() => void retryCategories()}>إعادة المحاولة</button></div>}
      {!categoryLoading && !categoryError && categories?.length === 0 && <div style={panel} role="status">لا توجد تصنيفات في مصدر البيانات الحالي.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 14 }}>
        {(categories ?? []).filter((row) => !row.parent_id).map((row) => {
          const children = (categories ?? []).filter((child) => child.parent_id === row.id);
          const count = (products ?? []).filter((product) => product.category_id === row.id).length;
          const categorySlug = slug(row.name) || row.id;
          return <article key={row.id} style={panel}>
            <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>{row.name}</h2><p style={quiet}>{formatNumber(count)} منتج مرتبط مباشرة بالتصنيف</p>
            <Link to="/category/$slug" params={{ slug: categorySlug }}>عرض المنتجات</Link>
            {children.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border, #dce8e6)" }}>
              {children.map((child) => <Link key={child.id} to="/category/$slug/subcategory/$subcategorySlug" params={{ slug: categorySlug, subcategorySlug: slug(child.name) || child.id }}>{child.name}</Link>)}
            </div>}
          </article>;
        })}
      </div>
    </>}

    {mode === "offers" && <section style={{ display: "grid", gap: 12 }}>
      {promotionLoading && <p role="status">جارٍ تحميل العروض...</p>}
      {promotionError && <div style={panel} role="alert">تعذر تحميل العروض: {promotionError.message} <button type="button" onClick={() => void retryPromotions()}>إعادة المحاولة</button></div>}
      {!promotionLoading && !promotionError && liveOffers.length === 0 && <div style={panel} role="status">لا توجد عروض مفعلة ضمن فترة الصلاحية التي أعادها الخادم.</div>}
      {liveOffers.map((item) => <PromotionCard key={item.id} item={item} />)}
      <p style={quiet}>لا توجد علاقة موثقة تربط كل عرض بأصناف محددة في هذا العرض العام؛ لذلك لا ننسب خصمًا لمنتج دون علاقة مصدر مؤكدة.</p>
    </section>}

    {mode === "featured" && <section style={{ ...panel, maxWidth: 820 }} role="status">
      <AlertCircle size={26} aria-hidden="true" /><h2>مصدر المنتجات المميزة غير مهيأ</h2>
      <p style={quiet}>عقد المنتج الحالي لا يوفر علامة موثوقة للمميز؛ لن نخترع ترتيبًا أو نستخدم بيانات عشوائية.</p><Link to="/catalog">فتح الكتالوج الحالي</Link>
    </section>}

    {mode === "collection" && <section style={{ display: "grid", gap: 12 }}>
      {!categoryLoading && !categoryError && !matchedCategory && <div style={panel} role="alert"><h2>المجموعة غير موجودة</h2><p style={quiet}>لم يطابق العنوان تصنيفًا حقيقيًا، ولا يوجد مصدر مستقل موثق للمجموعات التسويقية.</p><Link to="/collections">عرض مجموعات التصفح المتاحة</Link></div>}
      {categoryError && <div style={panel} role="alert">تعذر التحقق من المجموعة: {categoryError.message} <button type="button" onClick={() => void retryCategories()}>إعادة المحاولة</button></div>}
      {matchedCategory && <p style={quiet}>يطابق هذا الرابط تصنيفًا حقيقيًا ({matchedCategory.name})؛ لا يُعامل كيانًا تسويقيًا مستقلاً.</p>}
      {matchedCategory && <ProductGrid products={results} loading={productLoading} error={productError?.message ?? null} retry={() => void retryProducts()} empty="لا توجد منتجات مرتبطة بهذا التصنيف." />}
    </section>}

    {mode === "advanced-search" && <section style={{ display: "grid", gap: 14 }}>
      <form style={{ ...panel, display: "grid", gap: 12 }} onSubmit={(event) => event.preventDefault()}>
        <label style={{ display: "grid", gap: 6 }}>نص البحث<input style={control} value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} placeholder="الاسم أو الرمز أو الباركود" /></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>التصنيف<select style={control} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">جميع التصنيفات</option>{(categories ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label style={{ display: "grid", gap: 6 }}>ترتيب النتائج<select style={control} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="source">ترتيب المصدر</option><option value="name">الاسم</option><option value="newest">الأحدث حسب تاريخ السجل</option><option value="stock">المخزون المتاح الأعلى</option></select></label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /> أصناف لديها مخزون متاح فقط</label>
        <p style={{ ...quiet, margin: 0 }}>الأسعار المعروضة هي ما يسمح به خادم تسعير الحساب الحالي؛ ولا تنفذ هذه الشاشة تغييرات مالية أو مخزنية.</p>
      </form>
      {categoryError && <p role="alert">تعذر تحميل التصنيفات: {categoryError.message}</p>}
      <ProductGrid products={results} loading={productLoading} error={productError?.message ?? null} retry={() => void retryProducts()} empty="لا توجد نتائج لهذه المعايير." />
    </section>}
  </main>;
}

export function CustomerPopularProductsPage() {
  const { data: products, loading: productsLoading, error: productsError, refetch: retryProducts } = useFetch(fetchProducts);
  const { data: rankings, loading: rankingLoading, error: rankingError, refetch: retryRankings } = useFetch(fetchPopularProductRanking);

  const productsById = useMemo(() => new Map((products ?? []).map((product) => [product.id, product])), [products]);
  const rankedProducts = useMemo(
    () => (rankings ?? []).flatMap((row) => {
      const product = productsById.get(row.product_id);
      return product ? [product] : [];
    }),
    [rankings, productsById],
  );
  const rankingByProductId = useMemo(
    () => new Map((rankings ?? []).map((row) => [row.product_id, row] as const)),
    [rankings],
  );

  return <main dir="rtl" className="storefront" style={shell}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 22 }}>
      <div>
        <p style={{ margin: "0 0 4px", ...quiet }}>الأغبري · ترتيب خادمي ضمن نطاق المؤسسة الحالية</p>
        <h1 style={{ margin: 0, fontSize: 30 }}>الأكثر طلبًا</h1>
        <p style={quiet}>يعتمد الترتيب على الكميات المعتمدة في الطلبات المؤكدة وقيد المعالجة والشحن والتسليم. لا تُعرض إجماليات المبيعات أو مبالغ الطلبات.</p>
      </div>
      <nav aria-label="روابط الكتالوج" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Link to="/catalog">الكتالوج</Link><Link to="/categories">التصنيفات</Link><Link to="/search/advanced">بحث متقدم</Link><Link to="/cart">السلة</Link>
      </nav>
    </header>

    {rankingLoading && <div style={panel} role="status">جارٍ حساب ترتيب الأصناف من الطلبات المؤهلة...</div>}
    {rankingError && <div style={panel} role="alert">تعذر تحميل ترتيب الطلبات: {rankingError} <button type="button" onClick={() => void retryRankings()}>إعادة المحاولة</button></div>}
    {!rankingLoading && !rankingError && (rankings ?? []).length === 0 && <div style={panel} role="status">لا توجد طلبات مؤهلة كافية لإنشاء ترتيب موثوق للأكثر طلبًا.</div>}
    {!rankingLoading && !rankingError && (rankings ?? []).length > 0 && productsError && (products ?? []).length === 0 &&
      <div style={panel} role="alert">تعذر مطابقة الأصناف مع ترتيب الخادم: {productsError} <button type="button" onClick={() => void retryProducts()}>إعادة تحميل الكتالوج</button></div>}
    {!rankingLoading && !rankingError && (rankings ?? []).length > 0 &&
      <ProductGrid
        products={rankedProducts}
        loading={productsLoading}
        error={productsError}
        retry={() => void retryProducts()}
        empty="عاد الخادم بترتيب، لكن لا توجد أصناف نشطة مطابقة له في الكتالوج الحالي."
        rankingByProductId={rankingByProductId}
      />}
  </main>;
}

function PromotionCard({ item }: { item: Promotion }) {
  return <article style={{ border: "1px solid var(--border, #dce8e6)", borderRadius: 16, padding: 18, background: "var(--card, #fff)", display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 14 }}>
    <span style={{ display: "grid", placeItems: "center", borderRadius: 12, background: "var(--secondary, #e9f2ef)", width: 48, height: 48 }}><Tag size={22} /></span>
    <div><h2 style={{ margin: "0 0 6px", fontSize: 19 }}>{item.title}</h2><p style={quiet}>{item.description || "لم يقدم الخادم وصفًا لهذا العرض."}</p><p style={quiet}>القيمة: {item.discount_value} {item.discount_type === "percentage" ? "%" : item.discount_type} · يبدأ {item.start_date} · ينتهي {item.end_date}</p></div>
  </article>;
}

function ProductGrid({ products, loading, error, retry, empty, rankingByProductId }: { products: ProductWithInventory[]; loading: boolean; error: string | null; retry: () => void; empty: string; rankingByProductId?: ReadonlyMap<string, PopularProductRanking> }) {
  if (loading && products.length === 0) return <div style={panel} role="status">جارٍ تحميل المنتجات من الخادم...</div>;
  if (error && products.length === 0) return <div style={panel} role="alert">تعذر تحميل المنتجات: {error} <button type="button" onClick={retry}>إعادة المحاولة</button></div>;
  if (!products.length) return <div style={panel} role="status">{empty}</div>;
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
    {products.map((product) => {
      const ranking = rankingByProductId?.get(product.id);
      return <article key={product.id} style={panel}>
      <Link to="/product/$id" params={{ id: product.id }} style={{ color: "inherit", textDecoration: "none" }}>
        {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" style={{ display: "block", width: "100%", height: 145, objectFit: "contain", marginBottom: 10 }} /> : <div style={{ display: "grid", placeItems: "center", height: 145, marginBottom: 10 }}><Boxes size={32} aria-hidden="true" /></div>}
        <h3 style={{ margin: "0 0 6px" }}>{product.name}</h3><div style={quiet}>{product.category?.name ?? "غير مصنف"} · <code>{product.item_code}</code></div>
        <p style={{ fontWeight: 700 }}>{typeof product.display_price === "number" ? formatCurrency(product.display_price) : "السعر غير متاح حاليًا"} <small>{product.unit}</small></p>
        <small style={quiet}>{formatNumber(product.inventory?.quantity_available ?? 0)} متاح حسب آخر قراءة</small>
        {ranking && <small style={{ display: "block", ...quiet, marginTop: 6 }}>الترتيب حسب الطلبات المعتمدة: {formatNumber(ranking.ranking_position)}</small>}
      </Link>
    </article>;
    })}
  </div>;
}
