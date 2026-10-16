import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  fetchCategories: vi.fn(),
  fetchPromotions: vi.fn(),
  fetchPopularProductRanking: vi.fn(),
  popularRanking: [
    { product_id: "product-99", ranking_position: 1 },
    { product_id: "product-3", ranking_position: 2 },
    { product_id: "product-1", ranking_position: 3 },
  ],
  fetchSettingsMap: vi.fn(),
  user: null as null | { profileId: string; roles: string[]; name: string },
  rpc: vi.fn(async () => ({ data: null as unknown, error: null as unknown })),
  products: [
    { id: "product-1", name: "Rice", item_code: "SKU-001", barcode: null, description: null, unit: "carton", base_price: 1000, cost_price: 600, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1000, wholesale_price: 900, inventory: { id: "inv-1", product_id: "product-1", warehouse_id: "warehouse-1", quantity_on_hand: 20, quantity_reserved: 0, quantity_available: 20, reorder_point: 0 } },
    { id: "product-2", name: "Sugar", item_code: "SKU-002", barcode: null, description: null, unit: "carton", base_price: 1200, cost_price: 800, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1200, wholesale_price: 1100, inventory: { id: "inv-2", product_id: "product-2", warehouse_id: "warehouse-1", quantity_on_hand: 15, quantity_reserved: 0, quantity_available: 15, reorder_point: 0 } },
    { id: "product-3", name: "Oil", item_code: "SKU-003", barcode: null, description: null, unit: "carton", base_price: 1500, cost_price: 1000, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1500, wholesale_price: 1400, inventory: { id: "inv-3", product_id: "product-3", warehouse_id: "warehouse-1", quantity_on_hand: 12, quantity_reserved: 0, quantity_available: 12, reorder_point: 0 } },
    { id: "product-4", name: "Beans", item_code: "SKU-004", barcode: null, description: null, unit: "carton", base_price: 900, cost_price: 500, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 900, wholesale_price: 850, inventory: { id: "inv-4", product_id: "product-4", warehouse_id: "warehouse-1", quantity_on_hand: 9, quantity_reserved: 0, quantity_available: 9, reorder_point: 0 } },
  ],
}));

const initialProducts = [...mocks.products];
const initialPopularRanking = [...mocks.popularRanking];

vi.mock("@/lib/api", () => ({
  fetchProducts: mocks.fetchProducts,
  fetchCategories: mocks.fetchCategories,
  fetchPromotions: mocks.fetchPromotions,
  fetchPopularProductRanking: mocks.fetchPopularProductRanking,
  fetchSettingsMap: mocks.fetchSettingsMap,
}));

vi.mock("@/lib/useFetch", () => ({
  useFetch: (fetcher: unknown) => {
    if (fetcher === mocks.fetchProducts) return { data: mocks.products, loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchCategories) return { data: [], loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchPromotions) return { data: [], loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchPopularProductRanking) return { data: mocks.popularRanking, loading: false, error: null, refetch: vi.fn() };
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

type Mount = { root: Root; host: HTMLDivElement; active: boolean };
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
  const mount: Mount = { root, host, active: true };
  mounts.push(mount);
  const router = routerAt(path);
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
    mocks.products.splice(0, mocks.products.length, ...initialProducts);
    mocks.popularRanking.splice(0, mocks.popularRanking.length, ...initialPopularRanking);
    mocks.user = null;
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(async () => {
    for (const mount of mounts.splice(0)) await unmount(mount);
    window.localStorage.clear();
  });

  it("distinguishes an empty published catalog from a filtered empty result", async () => {
    mocks.products.splice(0, mocks.products.length);
    const empty = await mountAt("/");

    expect(empty.host.textContent).toContain("لا توجد أصناف منشورة حالياً");
    expect(empty.host.textContent).toContain("لا توجد أصناف نشطة متاحة للعرض في المتجر حالياً");
    expect(empty.host.textContent).not.toContain("جرّب تغيير البحث أو التصنيف");
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

  it("persists wishlist and caps comparison at three across direct route loads", async () => {
    const first = await mountAt("/");
    expect(first.host.textContent).toContain("المنتجات");

    clickButton(first.host, 'button[aria-label="إضافة للمفضلة"]', 0);
    await waitForStorage("aghbari:wishlist:v1", ["product-1"]);

    for (let index = 0; index < 4; index++) {
      clickButton(first.host, 'button[aria-label="إضافة للمقارنة"]', index);
    }
    await waitForStorage("aghbari:compare:v1", ["product-1", "product-2", "product-3"]);
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
