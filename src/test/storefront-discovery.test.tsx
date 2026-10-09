import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  fetchCategories: vi.fn(),
  fetchPromotions: vi.fn(),
  fetchSettingsMap: vi.fn(),
  products: [
    { id: "product-1", name: "Rice", item_code: "SKU-001", barcode: null, description: null, unit: "carton", base_price: 1000, cost_price: 600, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1000, wholesale_price: 900, inventory: { id: "inv-1", product_id: "product-1", warehouse_id: "warehouse-1", quantity_on_hand: 20, quantity_reserved: 0, quantity_available: 20, reorder_point: 0 } },
    { id: "product-2", name: "Sugar", item_code: "SKU-002", barcode: null, description: null, unit: "carton", base_price: 1200, cost_price: 800, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1200, wholesale_price: 1100, inventory: { id: "inv-2", product_id: "product-2", warehouse_id: "warehouse-1", quantity_on_hand: 15, quantity_reserved: 0, quantity_available: 15, reorder_point: 0 } },
    { id: "product-3", name: "Oil", item_code: "SKU-003", barcode: null, description: null, unit: "carton", base_price: 1500, cost_price: 1000, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 1500, wholesale_price: 1400, inventory: { id: "inv-3", product_id: "product-3", warehouse_id: "warehouse-1", quantity_on_hand: 12, quantity_reserved: 0, quantity_available: 12, reorder_point: 0 } },
    { id: "product-4", name: "Beans", item_code: "SKU-004", barcode: null, description: null, unit: "carton", base_price: 900, cost_price: 500, min_stock: 0, status: "active", category_id: null, image_url: null, created_at: "2026-01-01T00:00:00Z", retail_price: 900, wholesale_price: 850, inventory: { id: "inv-4", product_id: "product-4", warehouse_id: "warehouse-1", quantity_on_hand: 9, quantity_reserved: 0, quantity_available: 9, reorder_point: 0 } },
  ],
}));

vi.mock("@/lib/api", () => ({
  fetchProducts: mocks.fetchProducts,
  fetchCategories: mocks.fetchCategories,
  fetchPromotions: mocks.fetchPromotions,
  fetchSettingsMap: mocks.fetchSettingsMap,
}));

vi.mock("@/lib/useFetch", () => ({
  useFetch: (fetcher: unknown) => {
    if (fetcher === mocks.fetchProducts) return { data: mocks.products, loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchCategories) return { data: [], loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchPromotions) return { data: [], loading: false, error: null, refetch: vi.fn() };
    if (fetcher === mocks.fetchSettingsMap) return { data: {}, loading: false, error: null, refetch: vi.fn() };
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, configurationError: null, ready: true }),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: null, error: null })) },
  ORG_ID: "test-organization",
  ADMIN_PROFILE_ID: "test-admin-profile",
  WAREHOUSE_ID: "test-warehouse",
}));

import { routeTree } from "@/routeTree.gen";

function routerAt(path: string) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
}

describe("customer storefront saved discovery", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("persists wishlist and caps comparison at three across direct route loads", async () => {
    const first = render(<RouterProvider router={routerAt("/")} />);

    await screen.findByRole("heading", { name: /المنتجات/ });
    const wishlistButtons = screen.getAllByRole("button", { name: "إضافة للمفضلة" });
    fireEvent.click(wishlistButtons[0]);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("aghbari:wishlist:v1") || "[]")).toEqual(["product-1"]);
    });

    const compareButtons = screen.getAllByRole("button", { name: "إضافة للمقارنة" });
    fireEvent.click(compareButtons[0]);
    fireEvent.click(compareButtons[1]);
    fireEvent.click(compareButtons[2]);
    fireEvent.click(compareButtons[3]);

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("aghbari:compare:v1") || "[]")).toEqual(["product-1", "product-2", "product-3"]);
    });
    expect(await screen.findByRole("status")).toHaveTextContent("يمكن مقارنة ثلاثة أصناف فقط");

    first.unmount();
    render(<RouterProvider router={routerAt("/wishlist")} />);
    expect(await screen.findByRole("heading", { name: "المفضلة" })).toBeInTheDocument();
    expect(await screen.findByText("Rice")).toBeInTheDocument();
    expect(screen.queryByText("Sugar")).not.toBeInTheDocument();

    cleanup();
    render(<RouterProvider router={routerAt("/compare")} />);
    expect(await screen.findByRole("heading", { name: "مقارنة المنتجات" })).toBeInTheDocument();
    expect(await screen.findByText("Rice")).toBeInTheDocument();
    expect(await screen.findByText("Sugar")).toBeInTheDocument();
    expect(await screen.findByText("Oil")).toBeInTheDocument();
    expect(screen.queryByText("Beans")).not.toBeInTheDocument();
  });
});
