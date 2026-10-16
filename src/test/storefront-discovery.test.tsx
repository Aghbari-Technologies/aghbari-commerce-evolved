import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  fetchCategories: vi.fn(),
  productFetchError: null as string | null,
  categoryFetchError: null as string | null,
  refetchProducts: vi.fn(),
  fetchPromotions: vi.fn(),
  fetchPopularProductRanking: vi.fn(),
  fetchFeaturedProductRanking: vi.fn(),
  featuredRanking: [
    { product_id: "product-1", ranking_position: 1 },
    { product_id: "product-3", ranking_position: 2 },
  ],
  popularRanking: [
    { product_id: "product-3", ranking_position: 1 },
    { product_id: "product-1", ranking_position: 2 },
  ],
  fetchSettingsMap: vi.fn(),
  user: null as null | { profileId: string; roles: string[]; name: string },
  rpc: vi.fn(async (_name?: string, _args?: Record<string, unknown>) => ({ data: null as unknown, error: null as unknown })),
  products: [
    { id: "product-1", name: "Rice", item_code: "SKU-001", barcode: null, description: null, unit: "carton", base_price: 1000, cost_price: 600, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1000, wholesale_price: 900, inventory: { id: "inv-1", product_id: "product-1", warehouse_id: "warehouse-1", quantity_on_hand: 20, quantity_reserved: 0, quantity_available: 20, reorder_point: 0 } },
    { id: "product-2", name: "Sugar", item_code: "SKU-002", barcode: null, description: null, unit: "carton", base_price: 1200, cost_price: 800, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1200, wholesale_price: 1100, inventory: { id: "inv-2", product_id: "product-2", warehouse_id: "warehouse-1", quantity_on_hand: 15, quantity_reserved: 0, quantity_available: 15, reorder_point: 0 } },
    { id: "product-3", name: "Oil", item_code: "SKU-003", barcode: null, description: null, unit: "carton", base_price: 1500, cost_price: 1000, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1500, wholesale_price: 1400, inventory: { id: "inv-3", product_id: "product-3", warehouse_id: "warehouse-1", quantity_on_hand: 12, quantity_reserved: 0, quantity_available: 12, reorder_point: 0 } },
    { id: "product-4", name: "Beans", item_code: "SKU-004", barcode: null, description: null, unit: "carton", base_price: 900, cost_price: 500, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 900, wholesale_price: 850, inventory: { id: "inv-4", product_id: "product-4", warehouse_id: "warehouse-1", quantity_on_hand: 9, quantity_reserved: 0, quantity_available: 9, reorder_point: 0 } },
  ],
}));

const initialProducts = [...mocks.products];
const initialPopularRanking = [...mocks.popularRanking];
const initialFeaturedRanking = [...mocks.featuredRanking];

vi.mock("@/lib/api", () => ({
  fetchProducts: mocks.fetchProducts,
  fetchCategories: mocks.fetchCategories,
  fetchPromotions: mocks.fetchPromotions,
  fetchPopularProductRanking: mocks.fetchPopularProductRanking,
  fetchFeaturedProductRanking: mocks.fetchFeaturedProductRanking,
  fetchSettingsMap: mocks.fetchSettingsMap,
}));

vi.mock("@/lib/useFetch", () => ({
  useFetch: (fetcher: unknown) => {
    if (fetcher === mocks.fetchProducts) return { data: mocks.productFetchError ? null : mocks.products, loading: false, error: mocks.productFetchError, refetch: mocks.refetchProducts };
    if (fetcher === mocks.fetchCategories) return { data: mocks.categoryFetchError ? null : [], loading: false, error: mocks.categoryFetchError, refetch: vi.fn() };
    if (fetcher === mocks.fetchPromotions) return { data: [], loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchPopularProductRanking) return { data: mocks.popularRanking, loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchFeaturedProductRanking) return { data: mocks.featuredRanking, loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchSettingsMap) return { data: {}, loading: false, error: null, refetch: vi.fn() };
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mocks.user, configurationError: null, ready: true }),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: mocks.rpc },
  ORG_ID: "test-organization",
  ADMIN_PROFILE_ID: "test-admin-profile",
  WAREHOUSE_ID: "test-warehouse",
}));

import { routeTree } from "@/routeTree.gen";
import {
  appendOfflineCartMutation,
  createOfflineCartScopeKey,
  readOfflineCartLedger,
} from "@/lib/offline-cart-ledger";

type Mount = { root: Root; host: HTMLDivElement; active: boolean; router: ReturnType<typeof routerAt> };
const mounts: Mount[] = [];

function routerAt(path: string) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
}

async function mountAt(path: string): Promise<Mount> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const router = routerAt(path);
  const mount: Mount = { root, host, active: true, router };
  mounts.push(mount);
  await router.load();
  await act(async () => {
    root.render(<RouterProvider router={router} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return mount;
}

async function unmount(mount: Mount) {
  if (!mount.active) return;
  await act(async () => mount.root.unmount());
  mount.active = false;
  mount.host.remove();
}

function clickButton(host: HTMLElement, selector: string, index: number) {
  const button = host.querySelectorAll<HTMLButtonElement>(selector).item(index);
  if (!button) throw new Error("Could not find expected button: " + selector + " index " + index);
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("customer storefront saved discovery", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mocks.products.splice(0, mocks.products.length, ...initialProducts);
    mocks.popularRanking.splice(0, mocks.popularRanking.length, ...initialPopularRanking);
    mocks.featuredRanking.splice(0, mocks.featuredRanking.length, ...initialFeaturedRanking);
    mocks.user = null;
    mocks.productFetchError = null;
    mocks.categoryFetchError = null;
    mocks.refetchProducts.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(async () => {
    for (const mount of mounts.splice(0)) await unmount(mount);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it.each(["/catalog", "/cart", "/product/product-3", "/wishlist", "/compare"])(
    "returns a guest from the storefront header to the store on %s without opening admin",
    async (path) => {
      const screen = await mountAt(path);
      const exitButton = screen.host.querySelector<HTMLButtonElement>(".sf-admin-btn");

      expect(exitButton?.textContent).toContain("العودة إلى المتجر");
      expect(exitButton?.textContent).not.toContain("لوحة التحكم");

      await act(async () => {
        exitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.router.state.location.pathname).toBe("/");
      expect(screen.router.state.location.pathname).not.toBe("/admin");
    },
  );

  it.each(["/checkout", "/checkout/review"])(
    "returns to the cart from the checkout header on %s",
    async (path) => {
      const checkout = await mountAt(path);
      const exitButton = checkout.host.querySelector<HTMLButtonElement>(".sf-admin-btn");

      expect(exitButton?.textContent).toContain("العودة إلى السلة");
      expect(exitButton?.textContent).not.toContain("لوحة التحكم");

      await act(async () => {
        exitButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(checkout.router.state.location.pathname).toBe("/cart");
    },
  );

  it("distinguishes an empty published catalog from a filtered empty result", async () => {
    mocks.products.splice(0, mocks.products.length);
    const empty = await mountAt("/");

    expect(empty.host.textContent).toContain("لا توجد أصناف منشورة حالياً");
    expect(empty.host.textContent).toContain("لا توجد أصناف نشطة متاحة للعرض في المتجر حالياً");
    expect(empty.host.textContent).not.toContain("جرّب تغيير البحث أو التصنيف");
  });

  it("renders the correct active product details from a direct dynamic URL without leaking base price", async () => {
    const detail = await mountAt("/product/product-3");
    expect(detail.host.querySelector(".sf-product-detail h2")?.textContent).toBe("Oil");
    expect(detail.host.textContent).toContain("SKU: SKU-003");
    expect(detail.host.querySelector(".sf-btn-primary")?.textContent).toContain("إضافة إلى السلة");
    expect(detail.host.textContent).toContain("أضف للمفضلة");
    expect(detail.host.textContent).not.toContain("1500");
  });

  it("shows catalog and category read failures with a working retry action", async () => {
    mocks.productFetchError = "تعذر الاتصال بمصدر الكتالوج";
    mocks.categoryFetchError = "تعذر الاتصال بمصدر التصنيفات";

    const catalog = await mountAt("/catalog");
    expect(catalog.host.querySelector('[role="alert"]')?.textContent).toContain("تعذر تحميل الكتالوج");
    expect(catalog.host.textContent).toContain("تعذر الاتصال بمصدر الكتالوج");
    expect(catalog.host.textContent).toContain("تعذر تحميل التصنيفات؛ يمكنك البحث بالاسم أو رمز الصنف مؤقتًا.");

    const retry = Array.from(catalog.host.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.trim() === "إعادة المحاولة");
    expect(retry).toBeDefined();
    await act(async () => {
      retry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mocks.refetchProducts).toHaveBeenCalledTimes(1);
  });

  it("renders an explicit unavailable state for an unknown product identifier", async () => {
    const detail = await mountAt("/product/not-a-real-product");
    expect(detail.host.textContent).toContain("المنتج غير متاح");
    expect(detail.host.textContent).toContain("تعذر العثور على المنتج ضمن الكتالوج الحالي");
    expect(detail.host.querySelector(".sf-product-detail")).toBeNull();
  });

  it("renders the featured storefront using only server-selected catalog items", async () => {
    const featured = await mountAt("/featured");
    const names = Array.from(featured.host.querySelectorAll("article h3")).map((node) => node.textContent);
    expect(featured.host.textContent).toContain("المنتجات المميزة");
    expect(names).toEqual(["Rice", "Oil"]);
    expect(featured.host.textContent).toContain("الترتيب ضمن المنتجات المميزة");
    expect(featured.host.textContent).not.toContain("Sugar");
  });

  it("fails closed if a featured server id no longer exists in the active catalog", async () => {
    mocks.featuredRanking.splice(0, mocks.featuredRanking.length,
      { product_id: "missing-featured-product", ranking_position: 1 },
      { product_id: "product-1", ranking_position: 2 },
    );
    const featured = await mountAt("/featured");
    expect(featured.host.textContent).toContain("أُخفيت القائمة كاملة");
    expect(featured.host.querySelector("article h3")).toBeNull();
  });

  it("shows a deliberate empty state before an administrator selects featured products", async () => {
    mocks.featuredRanking.splice(0, mocks.featuredRanking.length);
    const featured = await mountAt("/featured");
    expect(featured.host.textContent).toContain("لم يحدد فريق الكتالوج منتجات مميزة");
    expect(featured.host.querySelector("article h3")).toBeNull();
  });

  it("orders the popular route by the server ranking and hides raw sales totals", async () => {
    const popular = await mountAt("/popular");
    const names = Array.from(popular.host.querySelectorAll("article h3")).map((node) => node.textContent);
    expect(popular.host.textContent).toContain("الأكثر طلبًا");
    expect(names).toEqual(["Oil", "Rice"]);
    expect(popular.host.textContent).toContain("الترتيب حسب الطلبات المعتمدة");
    expect(popular.host.textContent).toContain("لا تُعرض إجماليات المبيعات");
    expect(popular.host.textContent).not.toContain("Unknown product");
  });

  it("fails closed when server rankings cannot be matched to the active catalog", async () => {
    mocks.popularRanking.splice(0, mocks.popularRanking.length,
      { product_id: "missing-product", ranking_position: 1 },
      { product_id: "product-3", ranking_position: 2 },
    );
    const popular = await mountAt("/popular");
    expect(popular.host.textContent).toContain("أُخفي الترتيب كاملًا");
    expect(popular.host.querySelector("article h3")).toBeNull();
  });

  it("shows an explicit empty state when no server-backed popularity ranking exists", async () => {
    mocks.popularRanking.splice(0, mocks.popularRanking.length);
    const popular = await mountAt("/popular");
    expect(popular.host.textContent).toContain("لا توجد طلبات مؤهلة كافية");
    expect(popular.host.querySelector("article h3")).toBeNull();
  });

  it("isolates durable cart drafts by profile after the legacy cart is claimed", async () => {
    mocks.user = { profileId: "profile-a", roles: ["customer"], name: "CI Buyer" };
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify([{ product_id: "product-1", quantity: 2 }]));
    const first = await mountAt("/cart");
    expect(first.host.textContent).toContain("Rice");
    const owner = window.localStorage.getItem("aghbari:cart-owner:v1");
    expect(owner).toContain("profile-a");
    await unmount(first);

    mocks.user = { profileId: "profile-b", roles: ["customer"], name: "Other Buyer" };
    const second = await mountAt("/cart");
    expect(second.host.textContent).not.toContain("Rice");
    expect(second.host.textContent).toContain("سلتك فارغة");
  });

  it("keeps unavailable scoped draft lines visible and blocks checkout instead of silently dropping them", async () => {
    mocks.user = { profileId: "profile-a", roles: ["customer"], name: "CI Buyer" };
    const scope = createOfflineCartScopeKey("profile-a", window.location.origin);
    readOfflineCartLedger(window.localStorage, scope, []);
    appendOfflineCartMutation(window.localStorage, scope, {
      id: "known-and-unresolved",
      kind: "merge",
      lines: [
        { product_id: "product-1", quantity: 2 },
        { product_id: "missing-offline-product", quantity: 3 },
      ],
    });
    const cart = await mountAt("/cart");
    expect(cart.host.textContent).toContain("صنف محفوظ غير متاح");
    expect(cart.host.textContent).toContain("missing-offline-product");
    expect(cart.host.textContent).toContain("لن يُرسل طلب جزئي");
    const checkoutButton = Array.from(cart.host.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("راجع الأصناف غير المتاحة"));
    expect(checkoutButton).toBeDefined();
    expect(checkoutButton?.disabled).toBe(true);
  });

  it("blocks checkout and never submits an order when the server price preview is unavailable", async () => {
    mocks.user = { profileId: "checkout-profile", roles: ["customer"], name: "CI Buyer" };
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify([{ product_id: "product-1", quantity: 2 }]));
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });

    const checkout = await mountAt("/checkout");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(checkout.host.textContent).toContain("RPC unavailable");
    const submitButton = Array.from(checkout.host.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.includes("تأكيد الطلب"));
    expect(submitButton).toBeDefined();
    expect(submitButton?.disabled).toBe(true);
    expect(mocks.rpc.mock.calls.some(([name]) => name === "submit_customer_order")).toBe(false);
  });

  it("keeps cart amounts hidden when the server policy is off", async () => {
    mocks.user = { profileId: "customer-profile", roles: ["customer"], name: "CI Buyer" };
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify([{ product_id: "product-1", quantity: 2 }]));
    mocks.rpc.mockResolvedValue({
      data: {
        valid: true,
        pricing_verified: true,
        item_count: 1,
        currency: "YER",
        amounts_visible: false,
        items: [{ product_id: "product-1", name: "Rice", item_code: "SKU-001", unit: "carton", quantity: 2 }],
      },
      error: null,
    });

    const cart = await mountAt("/cart");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(mocks.rpc).toHaveBeenCalledWith("get_customer_checkout_preview", {
      p_items: [{ product_id: "product-1", quantity: 2 }],
    });
    expect(cart.host.textContent).toContain("سلة المشتريات");
    expect(cart.host.textContent).not.toContain("ملخص المبالغ التقديري");
    expect(cart.host.textContent).not.toContain("الإجمالي التقديري");
    expect(cart.host.textContent).not.toContain("سعر الوحدة");
  });

  it("shows only the server-authorized cart amount preview when the policy is on", async () => {
    mocks.user = { profileId: "customer-profile", roles: ["customer"], name: "CI Buyer" };
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify([{ product_id: "product-1", quantity: 2 }]));
    mocks.rpc.mockResolvedValue({
      data: {
        valid: true,
        pricing_verified: true,
        item_count: 1,
        currency: "YER",
        amounts_visible: true,
        total_amount: 40,
        items: [{ product_id: "product-1", name: "Rice", item_code: "SKU-001", unit: "carton", quantity: 2, unit_price: 20, line_total: 40 }],
      },
      error: null,
    });

    const cart = await mountAt("/cart");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(cart.host.textContent).toContain("ملخص المبالغ التقديري");
    expect(cart.host.textContent).toContain("الإجمالي التقديري");
    expect(cart.host.textContent).toContain("ر.ي");
    expect(cart.host.textContent).toContain("المبلغ تقديري للمعاينة");
  });

  it("fails closed when the cart financial RPC is unavailable", async () => {
    mocks.user = { profileId: "customer-profile", roles: ["customer"], name: "CI Buyer" };
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify([{ product_id: "product-1", quantity: 2 }]));
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });

    const cart = await mountAt("/cart");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(cart.host.textContent).toContain("تعذر التحقق من ملخص مالي موثوق");
    expect(cart.host.textContent).not.toContain("ملخص المبالغ التقديري");
    expect(cart.host.textContent).not.toContain("الإجمالي التقديري");
  });

  it("isolates saved wishlist and comparison records between signed-in profiles", async () => {
    window.localStorage.setItem("aghbari:wishlist:v2:profile:customer-a", JSON.stringify(["product-1"]));
    window.localStorage.setItem("aghbari:wishlist:v2:profile:customer-b", JSON.stringify(["product-3"]));
    window.localStorage.setItem("aghbari:compare:v2:profile:customer-a", JSON.stringify(["product-2"]));
    window.localStorage.setItem("aghbari:compare:v2:profile:customer-b", JSON.stringify(["product-4"]));

    mocks.user = { profileId: "customer-a", roles: ["customer"], name: "Buyer A" };
    const wishlistA = await mountAt("/wishlist");
    expect(wishlistA.host.textContent).toContain("Rice");
    expect(wishlistA.host.textContent).not.toContain("Oil");
    await unmount(wishlistA);

    const compareA = await mountAt("/compare");
    expect(compareA.host.textContent).toContain("Sugar");
    expect(compareA.host.textContent).not.toContain("Beans");
    await unmount(compareA);

    mocks.user = { profileId: "customer-b", roles: ["customer"], name: "Buyer B" };
    const wishlistB = await mountAt("/wishlist");
    expect(wishlistB.host.textContent).toContain("Oil");
    expect(wishlistB.host.textContent).not.toContain("Rice");
    await unmount(wishlistB);

    const compareB = await mountAt("/compare");
    expect(compareB.host.textContent).toContain("Beans");
    expect(compareB.host.textContent).not.toContain("Sugar");
  });

  it("keeps failed checkout visible, preserves the cart, and reuses the idempotency key on retry", async () => {
    mocks.user = { profileId: "checkout-retry-profile", roles: ["customer"], name: "CI Buyer" };
    const savedCart = [{ product_id: "product-1", quantity: 2 }];
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify(savedCart));

    const preview = {
      valid: true,
      pricing_verified: true,
      item_count: 1,
      currency: "YER",
      amounts_visible: false,
      items: [{ product_id: "product-1", name: "Rice", item_code: "SKU-001", unit: "carton", quantity: 2 }],
    };
    const attemptedKeys: string[] = [];
    mocks.rpc.mockImplementation(async (name, args) => {
      if (name === "get_customer_checkout_preview") return { data: preview, error: null };
      if (name === "submit_customer_order") {
        attemptedKeys.push(String(args?._idempotency_key ?? ""));
        return { data: null, error: { message: "تعذر تسجيل الطلب" } };
      }
      return { data: null, error: null };
    });

    const checkout = await mountAt("/checkout");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    const nameInput = checkout.host.querySelector<HTMLInputElement>('input[placeholder="اسمك الكامل"]');
    const phoneInput = checkout.host.querySelector<HTMLInputElement>('input[placeholder="7XX XXX XXX"]');
    expect(nameInput).toBeTruthy();
    expect(phoneInput).toBeTruthy();
    await act(async () => {
      const setValue = (element: HTMLInputElement, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        if (!setter) throw new Error("Native input setter is unavailable");
        setter.call(element, value);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
      setValue(nameInput!, "مشتري اختبار");
      setValue(phoneInput!, "777123456");
    });

    const submitOnce = async () => {
      const button = Array.from(checkout.host.querySelectorAll<HTMLButtonElement>("button"))
        .find((candidate) => candidate.textContent?.includes("تأكيد الطلب"));
      expect(button).toBeTruthy();
      expect(button?.disabled).toBe(false);
      await act(async () => {
        button!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };
    const assertSubmissionError = () => {
      const error = Array.from(checkout.host.querySelectorAll<HTMLElement>('[role="alert"].sf-form-error'))
        .find((element) => element.textContent?.includes("تعذر تسجيل الطلب"));
      expect(error?.textContent).toContain("تعذر تسجيل الطلب");
    };

    await submitOnce();
    assertSubmissionError();
    expect(checkout.host.textContent).not.toContain("تم استلام طلبك بنجاح");
    expect(checkout.host.textContent).toContain("Rice");
    expect(JSON.parse(window.localStorage.getItem("aghbari:cart:v1") || "null")).toEqual(savedCart);
    expect(attemptedKeys).toHaveLength(1);
    expect(attemptedKeys[0]).toMatch(/^[A-Za-z0-9_-]{16,128}$/);

    await submitOnce();
    expect(attemptedKeys).toHaveLength(2);
    expect(attemptedKeys[1]).toBe(attemptedKeys[0]);
    assertSubmissionError();
    expect(checkout.host.textContent).not.toContain("تم استلام طلبك بنجاح");
    expect(JSON.parse(window.localStorage.getItem("aghbari:cart:v1") || "null")).toEqual(savedCart);
  });

  it("renders the guarded AI settings screen without a style crash", async () => {
    mocks.user = { profileId: "admin-settings-profile", roles: ["staff"], name: "CI Staff" };

    const settings = await mountAt("/admin/ai/settings");

    expect(settings.host.textContent).toContain("إعدادات الذكاء");
    expect(settings.host.textContent).toContain("BLOCKED / NOT CONFIGURED");
    expect(settings.host.textContent).toContain("غير متصلة بعقد خادمي موثق");
    expect(settings.host.textContent).toContain("مركز الذكاء");
  });

  it("renders empty wishlist and comparison screens safely", async () => {
    mocks.user = { profileId: "empty-saved-lists-profile", roles: ["customer"], name: "CI Buyer" };

    const wishlist = await mountAt("/wishlist");
    expect(wishlist.host.textContent).toContain("المفضلة");
    expect(wishlist.host.textContent).toContain("لا توجد منتجات محفوظة في المفضلة ضمن الكتالوج الحالي");
    expect(wishlist.host.querySelectorAll("article")).toHaveLength(0);
    await unmount(wishlist);

    const compare = await mountAt("/compare");
    expect(compare.host.textContent).toContain("مقارنة المنتجات");
    expect(compare.host.textContent).toContain("اختر حتى ثلاثة منتجات من الكتالوج للمقارنة");
    expect(compare.host.querySelectorAll("article")).toHaveLength(0);
  });

  it("persists wishlist and caps comparison at three across direct route loads", async () => {
    mocks.user = { profileId: "saved-list-profile", roles: ["customer"], name: "CI Buyer" };
    const first = await mountAt("/");
    expect(first.host.textContent).toContain("المنتجات");

    clickButton(first.host, 'button[aria-label="إضافة للمفضلة"]', 0);
    await waitForStorage("aghbari:wishlist:v2:profile:saved-list-profile", ["product-1"]);

    for (let index = 0; index < 4; index++) {
      clickButton(first.host, 'button[aria-label="إضافة للمقارنة"]', index);
    }
    await waitForStorage("aghbari:compare:v2:profile:saved-list-profile", ["product-1", "product-2", "product-3"]);
    expect(first.host.textContent).toContain("يمكن مقارنة ثلاثة أصناف فقط");

    await unmount(first);
    const wishlist = await mountAt("/wishlist");
    expect(wishlist.host.textContent).toContain("المفضلة");
    expect(wishlist.host.textContent).toContain("Rice");
    expect(wishlist.host.textContent).not.toContain("Sugar");

    await unmount(wishlist);
    const compare = await mountAt("/compare");
    expect(compare.host.textContent).toContain("مقارنة المنتجات");
    expect(compare.host.textContent).toContain("Rice");
    expect(compare.host.textContent).toContain("Sugar");
    expect(compare.host.textContent).toContain("Oil");
    expect(compare.host.textContent).not.toContain("Beans");
  });
});

async function waitForStorage(key: string, expected: string[]) {
  await act(async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const value = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
      if (JSON.stringify(value) === JSON.stringify(expected)) return;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
  expect(JSON.parse(window.localStorage.getItem(key) || "[]")).toEqual(expected);
}
