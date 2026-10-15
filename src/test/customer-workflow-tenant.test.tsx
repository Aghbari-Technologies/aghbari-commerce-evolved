import {
  act } from "react";
import { createRoot,
  type Root } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory,
  createRouter,
  RouterProvider } from "@tanstack/react-router";
import { afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { createOfflineCartScopeKey,
  getOfflineCatalogCacheKey,
  readOfflineCartLedger,
  getOfflineCartLedgerPrefix,
  getOfflineCatalogSyncTimestampKey,
} from "@/lib/offline-cart-ledger";

const mocks = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    profileId: string;
    email: string;
    name: string;
    roles: string[];
    isStaff: boolean;
  },
  getCurrentTenantScope: vi.fn(),
  fetchProducts: vi.fn(),
  fetchResolvedProductPrices: vi.fn(),
  fetchSettings: vi.fn(),
  settings: [] as Array<{ id: string; organization_id: string; key: string; value: unknown; category: string; updated_at: string }>,
  from: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  responses: {} as Record<string, unknown[]>,
  queries: [] as Array<{
    table: string;
    columns?: string;
    filters: Array<{ column: string; value: unknown }>;
    orderBy?: string;
  }>,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mocks.user,
    ready: true,
    loading: false,
    configurationError: null,
    signOut: mocks.signOut,
  }),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/components/Login", () => ({
  Login: () => <div data-testid="login-required">تسجيل الدخول مطلوب</div>,
}));

vi.mock("@/lib/supabase", () => ({
  getCurrentTenantScope: mocks.getCurrentTenantScope,
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock("@/lib/api", () => ({
  fetchProducts: mocks.fetchProducts,
  fetchResolvedProductPrices: mocks.fetchResolvedProductPrices,
  fetchSettings: mocks.fetchSettings,
}));


const ORGANIZATION_ID = "a0000000-0000-0000-0000-000000000001";
const PROFILE_ID = "f1111111-1111-4111-8111-111111111111";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function makeQuery(table: string) {
  const record = {
    table,
    columns: undefined as string | undefined,
    filters: [] as Array<{ column: string; value: unknown }>,
    orderBy: undefined as string | undefined,
  };

  const query = {
    select(columns = "*") {
      record.columns = columns;
      return query;
    },
    eq(column: string, value: unknown) {
      record.filters.push({ column, value });
      return query;
    },
    order(column: string) {
      record.orderBy = column;
      return query;
    },
    limit(_limit: number) {
      return query;
    },
    maybeSingle() {
      return Promise.resolve({
        data: (mocks.responses[table] ?? [])[0] ?? null,
        error: null,
      });
    },
    then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      return Promise.resolve({
        data: mocks.responses[table] ?? [],
        error: null,
      }).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };
  mocks.queries.push(record);
  return query;
}

function queryFor(table: string) {
  const query = mocks.queries.find((entry) => entry.table === table);
  if (!query) throw new Error("Expected query for table: " + table);
  return query;
}

describe("customer workflow tenant and monetary display boundaries", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  let originalOnlineDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalOnlineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    window.localStorage.clear();
    vi.clearAllMocks();
    mocks.user = null;
    mocks.queries.splice(0);
    mocks.responses = {
      products: [{
        id: "product-1",
        name: "Rice",
        item_code: "SKU-001",
        barcode: null,
        unit: "carton",
        base_price: 1000,
        status: "active",
      }],
      sales_quotes: [],
    };
    mocks.getCurrentTenantScope.mockResolvedValue({
      profileId: PROFILE_ID,
      organizationId: ORGANIZATION_ID,
      warehouseId: null,
      isStaff: false,
    });
    mocks.fetchProducts.mockResolvedValue([]);
    mocks.fetchResolvedProductPrices.mockImplementation(async (ids: string[]) => new Map(ids.map((id) => [id, 1000])));
    mocks.settings = [];
    mocks.fetchSettings.mockImplementation(async () => [...mocks.settings]);
    mocks.from.mockImplementation((table: string) => makeQuery(table));
    mocks.rpc.mockImplementation(async (name: string, args: { p_surface?: string; p_visible?: boolean }) => {
      if (name === "set_customer_money_display_policy" && (args.p_surface === "cart" || args.p_surface === "order")) {
        const key = args.p_surface === "cart" ? "customer_cart_amounts_visible" : "customer_order_amounts_visible";
        const existing = mocks.settings.find((setting) => setting.key === key);
        if (existing) existing.value = args.p_visible;
        else mocks.settings.push({
          id: "setting-" + args.p_surface,
          organization_id: ORGANIZATION_ID,
          key,
          value: args.p_visible,
          category: "privacy",
          updated_at: "2026-10-15T00:00:00.000Z",
        });
        return { data: { surface: args.p_surface, visible: args.p_visible }, error: null };
      }
      return { data: null, error: null };
    });
  });

  afterEach(async () => {
    window.localStorage.clear();
    if (originalOnlineDescriptor) {
      Object.defineProperty(window.navigator, "onLine", originalOnlineDescriptor);
    }
    if (root) {
      await act(async () => root?.unmount());
      root = undefined;
    }
    host?.remove();
    host = undefined;
  });

  async function mountQuoteWorkspace(path = "/quotes") {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
      context: { queryClient: new QueryClient() },
    });
    await router.load();
    await act(async () => {
      root?.render(<RouterProvider router={router} />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  function configureCustomerOrderFixture(orderId: string) {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };
    mocks.responses = {
      orders: [{
        id: orderId,
        order_number: "SO-UI-001",
        customer_id: "44444444-4444-4444-8444-444444444444",
        status: "pending",
        total_items: 2,
        notes: null,
        created_at: "2026-10-15T09:00:00.000Z",
        quantity_review_required: false,
        customer_adjustment_note: null,
        customer_payment_requested_at: null,
        customer_confirmed_at: null,
        payment_request_status: "none",
        delivery_address_snapshot: null,
      }],
      order_items: [{
        id: "55555555-5555-4555-8555-555555555555",
        order_id: orderId,
        item_code: "SKU-001",
        product_name_snapshot: "Rice",
        unit_snapshot: "carton",
        quantity: 2,
        requested_quantity: 2,
        approved_quantity: 2,
      }],
      order_status_history: [],
      customers: [{ customer_code: "C-001", business_name: "متجر الاختبار", contact_name: null }],
    };
  }


  it("keeps recorded order money hidden when the server policy is off", async () => {
    const orderId = "33333333-3333-4333-8333-333333333333";
    configureCustomerOrderFixture(orderId);
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "get_customer_order_financials") {
        return {
          data: {
            amounts_visible: false,
            currency: "YER",
            total_amount: null,
            items: [{
              id: "55555555-5555-4555-8555-555555555555",
              unit_price: null,
              line_total: null,
            }],
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await mountQuoteWorkspace("/orders/" + orderId);

    expect(mocks.rpc).toHaveBeenCalledWith("get_customer_order_financials", { p_order_id: orderId });
    expect(host?.textContent).toContain("تفاصيل الكميات للمتابعة");
    expect(host?.textContent).not.toContain("سعر الوحدة");
    expect(host?.textContent).not.toContain("الإجمالي المسجل للطلب");
    const itemQuery = queryFor("order_items");
    expect(itemQuery.columns).toBe("id,item_code,product_name_snapshot,unit_snapshot,quantity,requested_quantity,approved_quantity");
    expect(itemQuery.columns).not.toMatch(/unit_price|line_total|total_amount/i);
  });

  it("shows recorded order money only when the scoped RPC explicitly authorizes it", async () => {
    const orderId = "33333333-3333-4333-8333-333333333333";
    configureCustomerOrderFixture(orderId);
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "get_customer_order_financials") {
        return {
          data: {
            amounts_visible: true,
            currency: "YER",
            total_amount: 40,
            items: [{
              id: "55555555-5555-4555-8555-555555555555",
              unit_price: 20,
              line_total: 40,
            }],
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    await mountQuoteWorkspace("/orders/" + orderId);

    expect(host?.textContent).toContain("سعر الوحدة");
    expect(host?.textContent).toContain("الإجمالي");
    expect(host?.textContent).toContain("الإجمالي المسجل للطلب");
    expect(host?.textContent).toContain("ر.ي");
  });

  it("fails closed on recorded order amounts when the policy RPC fails", async () => {
    const orderId = "33333333-3333-4333-8333-333333333333";
    configureCustomerOrderFixture(orderId);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });

    await mountQuoteWorkspace("/orders/" + orderId);

    expect(host?.textContent).toContain("المبالغ غير معروضة");
    expect(host?.textContent).not.toContain("سعر الوحدة");
    expect(host?.textContent).not.toContain("الإجمالي المسجل للطلب");
  });

  it("lets a manager change cart and order visibility independently through the governed RPC", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-manager@example.test",
      name: "CI Manager",
      roles: ["manager"],
      isStaff: true,
    };
    mocks.settings = [
      {
        id: "setting-cart",
        organization_id: ORGANIZATION_ID,
        key: "customer_cart_amounts_visible",
        value: false,
        category: "privacy",
        updated_at: "2026-10-15T00:00:00.000Z",
      },
      {
        id: "setting-order",
        organization_id: ORGANIZATION_ID,
        key: "customer_order_amounts_visible",
        value: false,
        category: "privacy",
        updated_at: "2026-10-15T00:00:00.000Z",
      },
    ];

    await mountQuoteWorkspace("/admin/settings");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(host?.textContent).toContain("الإعدادات العامة");
    const storefrontTab = Array.from(host?.querySelectorAll<HTMLButtonElement>(".settings-tabs button") ?? [])
      .find((button) => button.textContent?.trim() === "المتجر");
    expect(storefrontTab).toBeDefined();
    await act(async () => {
      storefrontTab?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const findVisibilityInput = (label: string) => {
      const row = Array.from(host?.querySelectorAll<HTMLElement>(".setting-row") ?? [])
        .find((element) => element.textContent?.includes(label));
      const input = row?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (!input) throw new Error("Missing visibility toggle: " + label);
      return input;
    };
    const cartInput = findVisibilityInput("إظهار الأسعار والإجمالي التقديري في السلة وإتمام الطلب");
    const orderInput = findVisibilityInput("إظهار أسعار وإجمالي الطلب المسجّل للعميل");
    expect(cartInput.checked).toBe(false);
    expect(orderInput.checked).toBe(false);

    await act(async () => {
      cartInput.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_customer_money_display_policy", { p_surface: "cart", p_visible: true });
    expect(findVisibilityInput("إظهار الأسعار والإجمالي التقديري في السلة وإتمام الطلب").checked).toBe(true);
    expect(findVisibilityInput("إظهار أسعار وإجمالي الطلب المسجّل للعميل").checked).toBe(false);

    await act(async () => {
      findVisibilityInput("إظهار أسعار وإجمالي الطلب المسجّل للعميل").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_customer_money_display_policy", { p_surface: "order", p_visible: true });
    const policyCalls = mocks.rpc.mock.calls.filter((call) => call[0] === "set_customer_money_display_policy");
    expect(policyCalls).toHaveLength(2);
    expect(policyCalls.map((call) => call[1]?.p_surface)).toEqual(["cart", "order"]);
  });

  it("never exposes manager money-display controls to a customer account", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };

    await mountQuoteWorkspace("/admin/settings");

    expect(host?.textContent).toContain("لا تملك صلاحية الإدارة");
    expect(host?.textContent).not.toContain("إظهار الأسعار والإجمالي التقديري في السلة وإتمام الطلب");
    expect(host?.textContent).not.toContain("إظهار أسعار وإجمالي الطلب المسجّل للعميل");
    expect(mocks.fetchSettings).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires an authenticated user before loading customer quote or catalog data", async () => {
    await mountQuoteWorkspace();

    expect(host?.querySelector('[data-testid="login-required"]')).not.toBeNull();
    expect(mocks.getCurrentTenantScope).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("loads the customer catalog only after resolving the organization from the server scope", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };

    await mountQuoteWorkspace();

    expect(host?.textContent).toContain("عروض الأسعار");
    expect(host?.textContent).toContain("Rice");
    expect(host?.textContent).toContain("لم ترسل عروض أسعار بعد.");
    expect(mocks.getCurrentTenantScope).toHaveBeenCalledTimes(1);

    const productQuery = queryFor("products");
    expect(productQuery.columns).toBe("id,name,item_code,barcode,unit,status");
    expect(productQuery.columns).not.toMatch(/base_price|cost_price|retail_price|wholesale_price|purchase_cost/i);
    expect(mocks.fetchResolvedProductPrices).toHaveBeenCalledWith(["product-1"]);
    expect(productQuery.filters).toContainEqual({
      column: "organization_id",
      value: ORGANIZATION_ID,
    });
    expect(productQuery.filters).toContainEqual({
      column: "status",
      value: "active",
    });
    expect(queryFor("sales_quotes")).toBeDefined();
  });



  it("resolves customer-tier prices on the reorder route without selecting base_price", async () => {
    mocks.user = {
      id: USER_ID, profileId: PROFILE_ID, email: "ci-customer@example.test", name: "CI Customer",
      roles: ["customer"], isStaff: false,
    };
    await mountQuoteWorkspace("/reorder");
    expect(host?.textContent).toContain("إعادة الطلب");
    expect(host?.textContent).toContain("Rice");
    expect(mocks.fetchResolvedProductPrices).toHaveBeenCalledWith(["product-1"]);
    const products = queryFor("products");
    expect(products.columns).toBe("id,name,item_code,barcode,unit,status");
    expect(products.columns).not.toMatch(/base_price|retail_price|wholesale_price|purchase_cost/i);
    expect(products.filters).toContainEqual({ column: "organization_id", value: ORGANIZATION_ID });
    expect(products.filters).toContainEqual({ column: "status", value: "active" });
  });

  it("resolves the barcode result price through the server helper", async () => {
    mocks.user = {
      id: USER_ID, profileId: PROFILE_ID, email: "ci-customer@example.test", name: "CI Customer",
      roles: ["customer"], isStaff: false,
    };
    await mountQuoteWorkspace("/barcode");
    const input = host?.querySelector<HTMLInputElement>('input[aria-label="رقم الباركود"]');
    const form = input?.closest("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "SKU-001");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host?.textContent).toContain("Rice");
    expect(mocks.fetchResolvedProductPrices).toHaveBeenCalledWith(["product-1"]);
    const products = queryFor("products");
    expect(products.columns).toBe("id,name,item_code,barcode,unit,status");
    expect(products.columns).not.toMatch(/base_price|retail_price|wholesale_price|purchase_cost/i);
    expect(products.filters).toContainEqual({ column: "organization_id", value: ORGANIZATION_ID });
    expect(products.filters).toContainEqual({ column: "status", value: "active" });
  });

  it("resolves assistant catalog search prices through the server helper", async () => {
    mocks.user = {
      id: USER_ID, profileId: PROFILE_ID, email: "ci-customer@example.test", name: "CI Customer",
      roles: ["customer"], isStaff: false,
    };
    await mountQuoteWorkspace("/assistant");
    const input = host?.querySelector<HTMLTextAreaElement>("textarea");
    const form = input?.closest("form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(input, "ابحث عن Rice");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host?.textContent).toContain("نتائج من الكتالوج");
    expect(host?.textContent).toContain("Rice");
    expect(mocks.fetchResolvedProductPrices).toHaveBeenCalledWith(["product-1"]);
    const products = queryFor("products");
    expect(products.columns).toBe("id,name,item_code,barcode,unit,status");
    expect(products.columns).not.toMatch(/base_price|retail_price|wholesale_price|purchase_cost/i);
    expect(products.filters).toContainEqual({ column: "organization_id", value: ORGANIZATION_ID });
    expect(products.filters).toContainEqual({ column: "status", value: "active" });
  });

  it("denies a customer from the admin quotes route before any staff data read", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };

    await mountQuoteWorkspace("/admin/quotes");

    expect(host?.textContent).toContain("لا تملك صلاحية الإدارة");
    expect(mocks.getCurrentTenantScope).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("allows an active staff identity to load the staff quotes workspace", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };

    await mountQuoteWorkspace("/admin/quotes");

    expect(host?.textContent).toContain("إدارة عروض الأسعار");
    expect(host?.textContent).toContain("لا توجد طلبات عروض أسعار.");
    expect(queryFor("sales_quotes").columns).toBe(
      "id,quote_number,status,notes,response_note,created_at,quoted_at,valid_until",
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it("sanitizes old and newly synced offline catalogs before persisting them", async () => {
    const unsafeRow = {
      id: "product-offline-1",
      name: "Sugar",
      item_code: "000125",
      barcode: "628123",
      unit: "carton",
      base_price: 1200,
      cost_price: 800,
      retail_price: 1200,
      wholesale_price: 1000,
      purchase_cost: 790,
      min_stock: 50,
      internal_notes: "private staff note",
      inventory: {
        id: "inventory-offline-1",
        product_id: "product-offline-1",
        warehouse_id: "warehouse-1",
        quantity_on_hand: 20,
        quantity_reserved: 4,
        quantity_available: 16,
        reorder_point: 8,
        internal_movement_note: "private stock note",
      },
      category: { id: "category-1", name: "Food", internal_note: "private category note" },
    };
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const catalogScopeBeforeMount = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    // Existing same-account cart contents must survive first seed creation before the catalog cache exists.
    window.localStorage.setItem("aghbari:cart:v1", JSON.stringify([
      { product_id: "product-offline-2", quantity: 2 },
    ]));
    window.localStorage.setItem("aghbari:cart-owner:v1", catalogScopeBeforeMount);
    // Simulate a legacy catalog written by a staff session before the allowlist was wired in.
    window.localStorage.setItem("aghbari:catalog:v1", JSON.stringify([unsafeRow]));
    mocks.fetchProducts.mockResolvedValueOnce([
      unsafeRow,
      { ...unsafeRow, id: "product-offline-2", name: "Rice", item_code: "000126" },
      {
        ...unsafeRow,
        id: "product-offline-3",
        name: "سُكَّر أبيض",
        item_code: "000127",
        barcode: "628127",
        category: { id: "category-food", name: "مَوَادّ غِذَائِيَّة" },
      },
    ]);

    await mountQuoteWorkspace("/offline");

    expect(window.localStorage.getItem("aghbari:catalog:v1")).toBeNull();
    const catalogScope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    expect(JSON.parse(window.localStorage.getItem(getOfflineCatalogCacheKey(catalogScope)) || "[]")).toEqual([]);

    const syncButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("تحديث الكتالوج المحلي"),
    );
    expect(syncButton).toBeDefined();
    await act(async () => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const syncedSafe = JSON.parse(window.localStorage.getItem(getOfflineCatalogCacheKey(catalogScope)) || "[]");
    expect(mocks.fetchProducts).toHaveBeenCalledTimes(1);
    expect(Number(window.localStorage.getItem(getOfflineCatalogSyncTimestampKey(catalogScope)))).toBeGreaterThan(0);
    expect(host?.textContent).toContain("آخر مزامنة ناجحة من الخادم");
    expect(syncedSafe).toHaveLength(3);
    expect(syncedSafe[0].base_price).toBe(0);
    expect(syncedSafe[0]).not.toHaveProperty("display_price");
    expect(syncedSafe[0]).not.toHaveProperty("cost_price");
    expect(syncedSafe[0]).not.toHaveProperty("retail_price");
    expect(syncedSafe[0]).not.toHaveProperty("wholesale_price");
    expect(syncedSafe[0].inventory).not.toHaveProperty("quantity_reserved");
    expect(syncedSafe[0].inventory).not.toHaveProperty("reorder_point");
    expect(host?.textContent).toContain("Sugar");
    expect(host?.textContent).toContain("Rice");
    const searchInput = host?.querySelector<HTMLInputElement>("#offline-catalog-search");
    expect(searchInput).toBeDefined();
    await act(async () => {
      if (searchInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(searchInput, "Rice");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    expect(host?.textContent).toContain("Rice");
    expect(host?.textContent).not.toContain("Sugar");
    await act(async () => {
      if (searchInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(searchInput, "سُكَر");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    expect(host?.textContent).toContain("سُكَّر أبيض");
    expect(host?.textContent).not.toContain("Sugar");

    await act(async () => {
      if (searchInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(searchInput, "غذائية");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    expect(host?.querySelector('[aria-labelledby="offline-catalog-heading"]')?.textContent).toContain("سُكَّر أبيض");
    expect(host?.querySelector('[aria-labelledby="offline-catalog-heading"]')?.textContent).not.toContain("Rice");

    await act(async () => {
      if (searchInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(searchInput, "Sugar");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    expect(host?.textContent).toContain("السعر والمخزون الحاليان يحتاجان مراجعة الخادم");

    const addButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("إضافة إلى المسودة المحلية"),
    );
    expect(addButton).toBeDefined();
    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const resultingDraft = readOfflineCartLedger(window.localStorage, catalogScope).lines;
    expect(resultingDraft).toHaveLength(2);
    expect(resultingDraft).toEqual(expect.arrayContaining([
      { product_id: "product-offline-1", quantity: 1 },
      { product_id: "product-offline-2", quantity: 2 },
    ]));
    expect(host?.textContent).toContain("لم يُرسل طلب");
    expect(mocks.rpc).not.toHaveBeenCalledWith("place_order", expect.anything());

    const increase = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.getAttribute("aria-label") === "زيادة كمية Rice",
    );
    expect(increase).toBeDefined();
    await act(async () => {
      increase?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(readOfflineCartLedger(window.localStorage, catalogScope).lines)
      .toEqual(expect.arrayContaining([
        { product_id: "product-offline-1", quantity: 1 },
        { product_id: "product-offline-2", quantity: 3 },
      ]));

    const removeSugar = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.getAttribute("aria-label") === "إزالة Sugar",
    );
    expect(removeSugar).toBeDefined();
    await act(async () => {
      removeSugar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(readOfflineCartLedger(window.localStorage, catalogScope).lines)
      .toEqual([{ product_id: "product-offline-2", quantity: 3 }]);
    expect(host?.textContent).toContain("تمت إزالة Sugar من المسودة المحلية فقط.");
    expect(mocks.rpc).not.toHaveBeenCalledWith("place_order", expect.anything());

    const nativeCreateObjectUrl = URL.createObjectURL;
    const nativeRevokeObjectUrl = URL.revokeObjectURL;
    let exportedBlob: Blob | null = null;
    let exportedFilename = "";
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        exportedBlob = blob;
        return "blob:aghbari-cart-backup-test";
      }),
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      exportedFilename = this.download;
    });
    try {
      const exportButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
        button.textContent?.includes("تنزيل نسخة احتياطية للمسودة"),
      );
      expect(exportButton).toBeDefined();
      await act(async () => {
        exportButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(exportedBlob).not.toBeNull();
      expect(exportedFilename).toMatch(/^aghbari-cart-draft-\d{4}-\d{2}-\d{2}\.json$/);
      const backupText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(exportedBlob as Blob);
      });
      const backup = JSON.parse(backupText);
      expect(backup.schema).toBe("aghbari.offline-cart-draft");
      expect(backup.version).toBe(1);
      expect(backup.lines).toEqual([{
        product_id: "product-offline-2",
        item_code: "000126",
        name: "Rice",
        unit: "carton",
        quantity: 3,
      }]);
      expect(backup.disclaimer).toContain("Not an order");
      expect(backupText).not.toMatch(/base_price|cost_price|retail_price|wholesale_price|purchase_cost|quantity_on_hand|quantity_reserved|quantity_available|internal_notes/i);
      expect(host?.textContent).toContain("تم تنزيل نسخة احتياطية للمسودة المحلية");
    } finally {
      anchorClick.mockRestore();
      if (nativeCreateObjectUrl) Object.defineProperty(URL, "createObjectURL", { configurable: true, value: nativeCreateObjectUrl });
      else delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
      if (nativeRevokeObjectUrl) Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: nativeRevokeObjectUrl });
      else delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
    }

    const clearButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("تفريغ المسودة المحلية"),
    );
    expect(clearButton).toBeDefined();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await act(async () => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(readOfflineCartLedger(window.localStorage, catalogScope).lines)
      .toEqual([{ product_id: "product-offline-2", quantity: 3 }]);
    expect(host?.textContent).toContain("أُلغي تفريغ المسودة");
    confirmSpy.mockReturnValue(true);
    await act(async () => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(readOfflineCartLedger(window.localStorage, catalogScope).lines).toEqual([]);
    expect(host?.textContent).toContain("تم تفريغ مسودة السلة المحلية فقط");
    expect(mocks.rpc).not.toHaveBeenCalledWith("place_order", expect.anything());
    confirmSpy.mockRestore();

    // Restore an allowlisted JSON backup with hostile extra fields, then import it
    // again to prove the stable restore mutation ID prevents duplicate quantities.
    const backupPayload = JSON.stringify({
      schema: "aghbari.offline-cart-draft",
      version: 1,
      exported_at: "2026-10-16T00:00:00.000Z",
      lines: [{
        product_id: "product-offline-2",
        item_code: "000126",
        name: "Rice",
        unit: "carton",
        quantity: 3,
        base_price: 999999,
        cost_price: 888888,
        internal_notes: "must not be imported",
      }],
    });
    const fakeBackupFile = {
      name: "backup.json",
      size: backupPayload.length,
      text: async () => backupPayload,
    } as File;
    const restoreConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const restoreInput = host?.querySelector<HTMLInputElement>("#offline-cart-backup-input");
    expect(restoreInput).toBeDefined();
    for (let attempt = 0; attempt < 2; attempt++) {
      Object.defineProperty(restoreInput, "files", {
        configurable: true,
        value: [fakeBackupFile],
      });
      await act(async () => {
        restoreInput?.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
    expect(readOfflineCartLedger(window.localStorage, catalogScope).lines)
      .toEqual([{ product_id: "product-offline-2", quantity: 3 }]);
    expect(host?.textContent).toContain("تم دمج النسخة الاحتياطية في المسودة المحلية");
    const storedLedgerRows = Array.from({ length: window.localStorage.length }, (_, index) => {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(getOfflineCartLedgerPrefix(catalogScope) + "op:")) return "";
      return window.localStorage.getItem(key) || "";
    }).join("\n");
    expect(storedLedgerRows).not.toMatch(/base_price|cost_price|internal_notes|888888|999999/i);
    expect(mocks.rpc).not.toHaveBeenCalledWith("place_order", expect.anything());
    restoreConfirm.mockRestore();
  });

  it("blocks subsequent local cart edits after an operation write fails", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const scope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    window.localStorage.setItem(getOfflineCatalogCacheKey(scope), JSON.stringify([{
      id: "offline-failure-product",
      name: "Storage Test",
      item_code: "000901",
      unit: "bag",
      base_price: 0,
    }]));
    await mountQuoteWorkspace("/offline");

    const addButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("إضافة إلى المسودة المحلية"),
    );
    expect(addButton).toBeDefined();
    const originalSetItem = Storage.prototype.setItem;
    const writeSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      if (key.startsWith(getOfflineCartLedgerPrefix(scope) + "op:")) {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(host?.querySelector('[role="alert"]')?.textContent).toContain("أعد التحقق من التخزين");
    expect(addButton?.disabled).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalledWith("place_order", expect.anything());
    writeSpy.mockRestore();
  });

  it("retries an uncertain local append with the same mutation ID instead of double-incrementing", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const scope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    window.localStorage.setItem(getOfflineCatalogCacheKey(scope), JSON.stringify([{
      id: "offline-idempotency-product",
      name: "Idempotency Test",
      item_code: "000902",
      unit: "bag",
      base_price: 0,
    }]));
    await mountQuoteWorkspace("/offline");

    const originalSetItem = Storage.prototype.setItem;
    const operationPrefix = getOfflineCartLedgerPrefix(scope) + "op:";
    let writeThenThrow = true;
    const writeSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      const result = originalSetItem.call(this, key, value);
      if (writeThenThrow && key.startsWith(operationPrefix)) {
        writeThenThrow = false;
        throw new DOMException("write result was uncertain", "QuotaExceededError");
      }
      return result;
    });

    const addButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("إضافة إلى المسودة المحلية"),
    );
    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain("أعد التحقق من التخزين");
    expect(readOfflineCartLedger(window.localStorage, scope).lines)
      .toEqual([{ product_id: "offline-idempotency-product", quantity: 1 }]);

    const retryButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("إعادة محاولة قراءة التخزين"),
    );
    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(readOfflineCartLedger(window.localStorage, scope).lines)
      .toEqual([{ product_id: "offline-idempotency-product", quantity: 1 }]);
    expect(host?.textContent).toContain("تسوية الحركات غير المحسومة دون تكرارها");
    expect(host?.querySelector('[role="alert"]')).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalledWith("place_order", expect.anything());
    writeSpy.mockRestore();
  });

  it("shows a storage error instead of a misleading empty-catalog state when the cart ledger is corrupt", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const scope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    window.localStorage.setItem(getOfflineCatalogCacheKey(scope), JSON.stringify([{
      id: "catalog-available-1",
      name: "Stored Flour",
      item_code: "000901",
      unit: "bag",
      base_price: 0,
      category: { id: "grains", name: "Grains" },
    }]));
    window.localStorage.setItem(
      getOfflineCartLedgerPrefix(scope) + "seed",
      JSON.stringify({
        version: 1,
        scope_key: "foreign-scope",
        id: "seed",
        kind: "seed",
        created_at: 0,
        lines: [],
      }),
    );

    await mountQuoteWorkspace("/offline");

    expect(host?.textContent).toContain("تعذر التحقق من سجل السلة المحلي");
    expect(host?.textContent).not.toContain("لا توجد أصناف محفوظة على هذا الجهاز");
    expect(host?.textContent).toContain("Stored Flour");
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain("لم تُرسل أي عملية");
    const unsafeMutationButtons = Array.from(host?.querySelectorAll("button") ?? []).filter((button) =>
      button.textContent?.includes("إضافة إلى المسودة المحلية") ||
      button.getAttribute("aria-label")?.startsWith("زيادة كمية ") ||
      button.getAttribute("aria-label")?.startsWith("إنقاص كمية ") ||
      button.getAttribute("aria-label")?.startsWith("إزالة "),
    );
    expect(unsafeMutationButtons.length).toBeGreaterThan(0);
    expect(unsafeMutationButtons.every((button) => button.disabled)).toBe(true);
    const retryButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("إعادة محاولة قراءة التخزين"),
    );
    expect(retryButton).toBeDefined();

    window.localStorage.removeItem(getOfflineCartLedgerPrefix(scope) + "seed");
    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host?.querySelector('[role="alert"]')).toBeNull();
    expect(host?.textContent).toContain("تم التحقق من التخزين وتسوية الحركات غير المحسومة دون تكرارها");
    expect(host?.textContent).toContain("Stored Flour");
    expect(host?.textContent).not.toContain("لا توجد أصناف محفوظة على هذا الجهاز");
  });

  it("preserves the last offline catalog when sync returns malformed server data", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const catalogScope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    window.localStorage.setItem(getOfflineCatalogCacheKey(catalogScope), JSON.stringify([{
      id: "offline-preserved-1",
      name: "Legacy Sugar",
      item_code: "000771",
      unit: "carton",
      base_price: 0,
    }]));
    mocks.fetchProducts.mockResolvedValueOnce({ malformed: true });

    await mountQuoteWorkspace("/offline");
    const cacheKey = getOfflineCatalogCacheKey(catalogScope);
    const beforeSync = window.localStorage.getItem(cacheKey);
    const syncButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("تحديث الكتالوج المحلي"),
    );
    expect(syncButton).toBeDefined();
    await act(async () => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(window.localStorage.getItem(cacheKey)).toBe(beforeSync);
    expect(host?.textContent).toContain("استجابة الكتالوج من الخادم غير صالحة؛ احتفظنا بالنسخة المحلية.");
    expect(host?.textContent).toContain("Legacy Sugar");
  });

  it("preserves prior cache data and blocks edits when persisting a sync fails", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const scope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    const cacheKey = getOfflineCatalogCacheKey(scope);
    const timestampKey = getOfflineCatalogSyncTimestampKey(scope);
    const priorCatalog = [{
      id: "existing-cache-product",
      name: "Previous Catalog",
      item_code: "000111",
      unit: "carton",
      base_price: 0,
    }];
    const priorTimestamp = String(Date.now() - 60_000);
    window.localStorage.setItem(cacheKey, JSON.stringify(priorCatalog));
    window.localStorage.setItem(timestampKey, priorTimestamp);
    const navigatorOnlineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "onLine");
    // Disable mount-time connectivity sync; this test targets the explicit refresh button.
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    await mountQuoteWorkspace("/offline");
    // Capture the allowlisted cache as rendered by the initial mount; the component
    // intentionally rewrites legacy cache entries before any sync attempt.
    const cacheBeforeSync = window.localStorage.getItem(cacheKey);
    const timestampBeforeSync = window.localStorage.getItem(timestampKey);
    expect(cacheBeforeSync).not.toBeNull();
    expect(timestampBeforeSync).toBe(priorTimestamp);
    await act(async () => {
      Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
      window.dispatchEvent(new Event("online"));
    });
    // The explicit refresh click now owns this response and persistence failure.
    mocks.fetchProducts.mockResolvedValueOnce([{
      id: "new-cache-product",
      name: "New Catalog",
      item_code: "000222",
      unit: "carton",
      base_price: 0,
    }]);

    const originalSetItem = Storage.prototype.setItem;
    let failedTimestampWrite = false;
    const writeSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key, value) {
      if (key === timestampKey && !failedTimestampWrite && value !== priorTimestamp) {
        failedTimestampWrite = true;
        throw new DOMException("quota exceeded", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });
    try {
      const syncButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
        button.textContent?.includes("تحديث الكتالوج المحلي"),
      );
      expect(syncButton).toBeDefined();
      expect(syncButton?.disabled).toBe(false);
      await act(async () => {
        syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(failedTimestampWrite).toBe(true);
      expect(window.localStorage.getItem(cacheKey)).toBe(cacheBeforeSync);
      expect(window.localStorage.getItem(timestampKey)).toBe(timestampBeforeSync);
      expect(host?.querySelector('[role="alert"]')?.textContent).toContain("فشل حفظ تحديث الكتالوج محليًا");
      expect(host?.textContent).toContain("لم نعلن نجاح المزامنة");
      const addButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
        button.textContent?.includes("إضافة إلى المسودة المحلية"),
      );
      expect(addButton?.disabled).toBe(true);
    } finally {
      writeSpy.mockRestore();
      if (navigatorOnlineDescriptor) {
        Object.defineProperty(window.navigator, "onLine", navigatorOnlineDescriptor);
      } else {
        delete (window.navigator as Partial<Navigator>).onLine;
      }
    }
  });

  it("warns when the saved local catalog is older than 24 hours", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-staff@example.test",
      name: "CI Staff",
      roles: ["staff"],
      isStaff: true,
    };
    const scope = createOfflineCartScopeKey(PROFILE_ID, window.location.origin);
    const cacheKey = getOfflineCatalogCacheKey(scope);
    const timestampKey = getOfflineCatalogSyncTimestampKey(scope);
    window.localStorage.setItem(cacheKey, JSON.stringify([{
      id: "offline-stale-1",
      name: "Legacy Rice",
      item_code: "000781",
      unit: "carton",
      base_price: 0,
    }]));
    window.localStorage.setItem(timestampKey, String(Date.now() - 48 * 60 * 60 * 1000));

    await mountQuoteWorkspace("/offline");

    expect(host?.textContent).toContain("نسخة الكتالوج قديمة");
    expect(host?.textContent).toContain("Legacy Rice");
    expect(host?.textContent).toContain("لا تعتمد على المخزون المحلي");
    expect(host?.textContent).not.toContain("سعر الوحدة");
  });

  it("shows invoice prices in the customer preview only from the scoped invoice RPC", async () => {
    const invoiceId = "22222222-2222-4222-8222-222222222222";
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };
    mocks.responses = {
      customer_invoices: [{
        id: invoiceId,
        invoice_number: "INV-UI-001",
        order_id: "33333333-3333-4333-8333-333333333333",
        customer_id: "44444444-4444-4444-8444-444444444444",
        status: "issued",
        issued_at: "2026-10-15T09:00:00.000Z",
        due_at: null,
        currency: "YER",
      }],
      orders: [{
        quantity_review_required: false,
        customer_adjustment_note: null,
        customer_payment_requested_at: null,
        payment_request_status: "none",
        status: "confirmed",
      }],
    };
    mocks.rpc.mockImplementation(async (name: string, args: { p_invoice_id?: string }) => {
      if (name !== "get_customer_invoice_pdf") return { data: null, error: null };
      expect(args).toEqual({ p_invoice_id: invoiceId });
      return {
        data: {
          amounts_visible: true,
          invoice: {
            id: invoiceId,
            invoice_number: "INV-UI-001",
            currency: "YER",
            subtotal: "25.00",
            tax_amount: "0.00",
            total_amount: "25.00",
          },
          lines: [{
            id: "55555555-5555-4555-8555-555555555555",
            item_code: "000125",
            description: "سكر أبيض",
            unit: "كرتون",
            quantity: "2",
            unit_price: "12.50",
            line_total: "25.00",
          }],
          customer: {
            customer_code: "000042",
            business_name: "متجر الاختبار",
            contact_name: null,
          },
        },
        error: null,
      };
    });

    await mountQuoteWorkspace("/invoices");
    expect(host?.textContent).toContain("فواتيري");
    const openButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("عرض / طباعة"),
    );
    expect(openButton).toBeDefined();

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mocks.rpc).toHaveBeenCalledWith("get_customer_invoice_pdf", { p_invoice_id: invoiceId });
    expect(host?.textContent).toContain("سعر الوحدة");
    expect(host?.textContent).toContain("الإجمالي المستحق");
    expect(host?.textContent).toContain("متجر الاختبار");
    expect(mocks.queries.some((query) => query.table === "customer_invoice_items")).toBe(false);
    expect(mocks.queries.some((query) => query.table === "customers")).toBe(false);
  });

  it("warns when the customer invoice list reaches its 100-row read cap", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };
    mocks.responses = {
      customer_invoices: Array.from({ length: 100 }, (_, index) => ({
        id: `invoice-${index + 1}`,
        invoice_number: `INV-${String(index + 1).padStart(3, "0")}`,
        order_id: `order-${index + 1}`,
        customer_id: "44444444-4444-4444-8444-444444444444",
        status: "issued",
        issued_at: "2026-10-15T09:00:00.000Z",
        due_at: null,
        currency: "YER",
      })),
    };

    await mountQuoteWorkspace("/invoices");

    expect(host?.textContent).toContain("فواتيري");
    expect(host?.textContent).toContain("عرض هذه الصفحة أحدث 100 فاتورة فقط");
  });

  it("fails closed when the authenticated server scope cannot be resolved", async () => {
    mocks.user = {
      id: USER_ID,
      profileId: PROFILE_ID,
      email: "ci-customer@example.test",
      name: "CI Customer",
      roles: ["customer"],
      isStaff: false,
    };
    mocks.getCurrentTenantScope.mockRejectedValueOnce(
      new Error("تعذر تحميل نطاق المؤسسة من الخادم."),
    );

    await mountQuoteWorkspace();

    expect(host?.textContent).toContain("تعذر تحميل نطاق المؤسسة من الخادم.");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
