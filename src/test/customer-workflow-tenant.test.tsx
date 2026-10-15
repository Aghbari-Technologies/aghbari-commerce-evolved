import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

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

describe("customer quote workspace tenant boundary", () => {
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
    mocks.from.mockImplementation((table: string) => makeQuery(table));
    mocks.rpc.mockResolvedValue({ data: null, error: null });
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
    // Simulate a legacy cache written by a staff session before the allowlist was wired in.
    window.localStorage.setItem("aghbari:catalog:v1", JSON.stringify([unsafeRow]));
    mocks.fetchProducts.mockResolvedValueOnce([unsafeRow]);

    await mountQuoteWorkspace("/offline");

    const legacySafe = JSON.parse(window.localStorage.getItem("aghbari:catalog:v1") || "[]");
    expect(legacySafe).toHaveLength(1);
    expect(legacySafe[0]).not.toHaveProperty("cost_price");
    expect(legacySafe[0]).not.toHaveProperty("retail_price");
    expect(legacySafe[0]).not.toHaveProperty("wholesale_price");
    expect(legacySafe[0]).not.toHaveProperty("purchase_cost");
    expect(legacySafe[0]).not.toHaveProperty("min_stock");
    expect(legacySafe[0]).not.toHaveProperty("internal_notes");
    expect(legacySafe[0].inventory).not.toHaveProperty("quantity_reserved");
    expect(legacySafe[0].inventory).not.toHaveProperty("reorder_point");
    expect(legacySafe[0].inventory).not.toHaveProperty("internal_movement_note");
    expect(legacySafe[0].category).not.toHaveProperty("internal_note");

    const syncButton = Array.from(host?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("تحديث الكتالوج المحلي"),
    );
    expect(syncButton).toBeDefined();
    await act(async () => {
      syncButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const syncedSafe = JSON.parse(window.localStorage.getItem("aghbari:catalog:v1") || "[]");
    expect(mocks.fetchProducts).toHaveBeenCalledTimes(1);
    expect(syncedSafe).toHaveLength(1);
    expect(syncedSafe[0]).not.toHaveProperty("cost_price");
    expect(syncedSafe[0]).not.toHaveProperty("retail_price");
    expect(syncedSafe[0]).not.toHaveProperty("wholesale_price");
    expect(syncedSafe[0].inventory).not.toHaveProperty("quantity_reserved");
    expect(syncedSafe[0].inventory).not.toHaveProperty("reorder_point");
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
