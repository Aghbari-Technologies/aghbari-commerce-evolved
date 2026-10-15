import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStorefrontDataScope: vi.fn(),
  getCurrentTenantScope: vi.fn(),
  from: vi.fn(),
  responses: {} as Record<string, { data: unknown[]; error: { message: string } | null }>,
  queries: [] as Array<{
    table: string;
    columns?: string;
    filters: Array<{ column: string; value: unknown }>;
    orderBy?: string;
  }>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from },
  getStorefrontDataScope: mocks.getStorefrontDataScope,
  getCurrentTenantScope: mocks.getCurrentTenantScope,
}));

import { fetchProducts } from "@/lib/api";

type MockResult = { data: unknown[]; error: { message: string } | null };
type MockQuery = PromiseLike<MockResult> & {
  select: (columns?: string) => MockQuery;
  eq: (column: string, value: unknown) => MockQuery;
  order: (column: string) => MockQuery;
};

const ORGANIZATION_ID = "a0000000-0000-0000-0000-000000000001";
const OTHER_ORGANIZATION_ID = "a1111111-1111-4111-8111-111111111111";
const WAREHOUSE_ID = "d0000000-0000-0000-0000-000000000001";

function makeQuery(table: string): MockQuery {
  const query = {
    table,
    columns: undefined as string | undefined,
    filters: [] as Array<{ column: string; value: unknown }>,
    orderBy: undefined as string | undefined,
  };

  const builder: MockQuery = {
    select(columns = "*") {
      query.columns = columns;
      return builder;
    },
    eq(column, value) {
      query.filters.push({ column, value });
      return builder;
    },
    order(column) {
      query.orderBy = column;
      return builder;
    },
    then(onfulfilled, onrejected) {
      const response = mocks.responses[table] ?? { data: [], error: null };
      return Promise.resolve(response).then(onfulfilled, onrejected);
    },
  };
  mocks.queries.push(query);
  return builder;
}

function queryFor(table: string) {
  const query = mocks.queries.find((entry) => entry.table === table);
  if (!query) throw new Error("Expected Supabase query for table: " + table);
  return query;
}

describe("public catalog privacy and tenant query contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queries.splice(0);
    mocks.responses = {
      products: { data: [], error: null },
      inventory_balances: { data: [], error: null },
      categories: { data: [], error: null },
    };
    mocks.from.mockImplementation((table: string) => makeQuery(table));
    mocks.getStorefrontDataScope.mockResolvedValue({
      organizationId: ORGANIZATION_ID,
      warehouseId: WAREHOUSE_ID,
      isStaff: false,
    });
  });

  it("selects only public product and inventory fields and scopes every read to the server-provided tenant", async () => {
    await expect(fetchProducts()).resolves.toEqual([]);

    const products = queryFor("products");
    expect(products.columns).toBe(
      "id,organization_id,category_id,name,item_code,barcode,description,unit,base_price,status,image_url,created_at",
    );
    expect(products.columns).not.toMatch(/cost_price|retail_price|wholesale_price|purchase_cost/i);
    expect(products.filters).toContainEqual({
      column: "organization_id",
      value: ORGANIZATION_ID,
    });

    const inventory = queryFor("inventory_balances");
    expect(inventory.columns).toBe(
      "id,product_id,warehouse_id,quantity_on_hand,quantity_available",
    );
    expect(inventory.columns).not.toMatch(/quantity_reserved|reorder_point|cost/i);
    expect(inventory.filters).toContainEqual({
      column: "warehouse_id",
      value: WAREHOUSE_ID,
    });

    const categories = queryFor("categories");
    expect(categories.filters).toContainEqual({
      column: "organization_id",
      value: ORGANIZATION_ID,
    });
    expect(mocks.from).toHaveBeenCalledTimes(3);
  });

  it("does not issue catalog queries if the server-derived storefront scope fails", async () => {
    mocks.getStorefrontDataScope.mockRejectedValueOnce(
      new Error("Public storefront tenant is not configured"),
    );

    await expect(fetchProducts()).rejects.toThrow(
      "Public storefront tenant is not configured",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses the authenticated staff scope for staff queries without trusting caller-supplied tenant IDs", async () => {
    mocks.getStorefrontDataScope.mockResolvedValueOnce({
      organizationId: OTHER_ORGANIZATION_ID,
      warehouseId: WAREHOUSE_ID,
      isStaff: true,
    });

    await expect(fetchProducts()).resolves.toEqual([]);

    expect(queryFor("products").columns).toBe("*");
    expect(queryFor("products").filters).toContainEqual({
      column: "organization_id",
      value: OTHER_ORGANIZATION_ID,
    });
    expect(queryFor("inventory_balances").columns).toBe("*");
    expect(queryFor("inventory_balances").filters).toContainEqual({
      column: "warehouse_id",
      value: WAREHOUSE_ID,
    });
  });
});
