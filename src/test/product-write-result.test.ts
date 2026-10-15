import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentTenantScope: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  insertResult: { data: { id: "product-001" } as { id: string } | null, error: null as { message: string } | null },
  updateResult: { data: { id: "product-001" } as { id: string } | null, error: null as { message: string } | null },
  rpcResult: { data: [] as Array<Record<string, unknown>>, error: null as { message: string } | null },
  lastQuery: null as null | {
    table: string;
    insertPayload?: Record<string, unknown>;
    updatePayload?: Record<string, unknown>;
    filters: Array<{ column: string; value: unknown }>;
    selected?: string;
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
  getCurrentTenantScope: mocks.getCurrentTenantScope,
}));

import { createProduct, updateProduct } from "@/lib/api";

const ORGANIZATION_ID = "org-current";
const PRODUCT_ID = "product-001";
const PRODUCT = {
  id: PRODUCT_ID,
  organization_id: ORGANIZATION_ID,
  name: "Product",
  item_code: "P-001",
  unit: "unit",
  base_price: 123,
  cost_price: 80,
  status: "active",
};

function setupQuery() {
  const query = {
    table: "products",
    filters: [] as Array<{ column: string; value: unknown }>,
    selected: undefined as string | undefined,
    insertPayload: undefined as Record<string, unknown> | undefined,
    updatePayload: undefined as Record<string, unknown> | undefined,
  };
  const builder = {
    insert(payload: Record<string, unknown>) {
      query.insertPayload = payload;
      return builder;
    },
    update(payload: Record<string, unknown>) {
      query.updatePayload = payload;
      return builder;
    },
    eq(column: string, value: unknown) {
      query.filters.push({ column, value });
      return builder;
    },
    select(columns: string) {
      query.selected = columns;
      return builder;
    },
    single: async () => mocks.insertResult,
    maybeSingle: async () => mocks.updateResult,
  };
  mocks.lastQuery = query;
  return builder;
}

describe("product write result verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lastQuery = null;
    mocks.insertResult = { data: { id: PRODUCT_ID }, error: null };
    mocks.updateResult = { data: { id: PRODUCT_ID }, error: null };
    mocks.rpcResult = { data: [PRODUCT], error: null };
    mocks.getCurrentTenantScope.mockResolvedValue({ organizationId: ORGANIZATION_ID });
    mocks.from.mockImplementation((table: string) => {
      if (table !== "products") throw new Error("Unexpected table " + table);
      return setupQuery();
    });
    mocks.rpc.mockImplementation(async (name: string, args: { p_product_id: string | null }) => {
      if (name !== "fetch_staff_products") throw new Error("Unexpected RPC " + name);
      return {
        data: mocks.rpcResult.data.filter((product) => product.id === args.p_product_id),
        error: null,
      };
    });
  });

  it("confirms creation through the safe id projection, then resolves private details through the staff RPC", async () => {
    await expect(createProduct({ name: "Product", item_code: "P-001" })).resolves.toMatchObject(PRODUCT);
    expect(mocks.lastQuery?.insertPayload).toMatchObject({
      organization_id: ORGANIZATION_ID,
      name: "Product",
      item_code: "P-001",
    });
    expect(mocks.lastQuery?.selected).toBe("id");
    expect(mocks.rpc).toHaveBeenCalledWith("fetch_staff_products", { p_product_id: PRODUCT_ID });
  });

  it("does not report successful creation when the insert returned no id", async () => {
    mocks.insertResult = { data: null, error: null };
    await expect(createProduct({ name: "Product", item_code: "P-001" })).rejects.toThrow(
      /تعذر تأكيد إنشاء الصنف/,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("confirms a same-tenant update and returns only the safe id from the write", async () => {
    await expect(updateProduct(PRODUCT_ID, { name: "Renamed" })).resolves.toMatchObject(PRODUCT);
    expect(mocks.lastQuery?.updatePayload).toEqual({ name: "Renamed" });
    expect(mocks.lastQuery?.filters).toEqual([
      { column: "id", value: PRODUCT_ID },
      { column: "organization_id", value: ORGANIZATION_ID },
    ]);
    expect(mocks.lastQuery?.selected).toBe("id");
    expect(mocks.rpc).toHaveBeenCalledWith("fetch_staff_products", { p_product_id: PRODUCT_ID });
  });

  it("fails closed when RLS or tenant filters match no product during update", async () => {
    mocks.updateResult = { data: null, error: null };
    await expect(updateProduct("product-not-in-tenant", { name: "Do not save" })).rejects.toThrow(
      /لم يُحفظ تعديل الصنف/,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("propagates write errors without issuing a follow-up staff read", async () => {
    mocks.updateResult = { data: null, error: { message: "permission denied" } };
    await expect(updateProduct(PRODUCT_ID, { name: "Do not save" })).rejects.toMatchObject({
      message: "permission denied",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
