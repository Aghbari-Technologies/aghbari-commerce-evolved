import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { Route as searchRoute } from "@/routes/search";

function makeRouter() {
  return createRouter({ routeTree, context: { queryClient: new QueryClient() } });
}

describe("new customer route coverage", () => {
  it.each([
    ["/catalog", "/catalog"],
    ["/products", "/products"],
    ["/search", "/search"],
    ["/pricing", "/pricing"],
    ["/company", "/company_"],
    ["/financial-documents", "/financial-documents"],
    ["/payments", "/payments"],
    ["/receivables", "/receivables"],
    ["/categories", "/categories"],
    ["/collections", "/collections"],
    ["/featured", "/featured"],
    ["/new", "/new"],
    ["/popular", "/popular"],
    ["/offers", "/offers"],
    ["/category/rice", "/category/$slug"],
    ["/category/food/subcategory/rice", "/category/$slug/subcategory/$subcategorySlug"],
    ["/collection/featured-rice", "/collection/$slug"],
    ["/search/advanced", "/search_/advanced"],
  ])("registers %s as a direct route", (path, routeId) => {
    const matches = makeRouter().matchRoutes(path as never);
    expect(matches.at(-1)?.routeId).toBe(routeId);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("bounds and validates direct search-query input without coercing non-string values", () => {
    const validateSearch = searchRoute.options.validateSearch as
      | ((input: Record<string, unknown>) => { q?: string })
      | undefined;
    expect(validateSearch).toBeTypeOf("function");
    expect(validateSearch?.({ q: "rice" })).toEqual({ q: "rice" });
    expect(validateSearch?.({ q: "x".repeat(250) })?.q).toHaveLength(200);
    expect(validateSearch?.({ q: 42 })).toEqual({ q: undefined });
    expect(validateSearch?.({ q: ["rice"] })).toEqual({ q: undefined });
  });
});
