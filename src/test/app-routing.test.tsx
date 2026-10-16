import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

function makeRouter() {
  return createRouter({ routeTree, context: { queryClient: new QueryClient() } });
}

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const matches = makeRouter().matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each([
    "/cart",
    "/addresses",
    "/templates",
    "/store",
    "/statements",
    "/profile",
    "/company/details",
    "/account/pending",
    "/onboarding/company",
    "/onboarding/profile",
    "/company/users",
    "/invite/" + "a".repeat(64),
    "/login",
    "/register",
    "/forgot-password",
    "/verify",
    "/checkout",
    "/checkout/review",
    "/checkout/confirm",
    "/compare",
    "/product/route-smoke-test-product",
    "/wishlist",
    "/assistant",
    "/barcode",
    "/invoices",
    "/statement",
    "/quotes",
    "/reorder",
    "/offline",
    "/admin",
    "/admin/workspace",
    "/admin/catalog",
    "/admin/data-center",
    "/admin/import",
    "/admin/import-logs",
    "/admin/onyx",
    "/admin/ai/stock-sync",
    "/admin/ai/sync",
    "/admin/finance-data",
    "/admin/ai/alerts",
    "/admin/ai/tasks",
    "/admin/ai/reports",
    "/admin/ai/executive",
    "/admin/order/11111111-1111-4111-8111-111111111111",
    "/admin/ai",
    "/admin/customers",
    "/admin/data",
    "/admin/devices",
    "/admin/finance",
    "/admin/notifications",
    "/admin/offers",
    "/admin/operations",
    "/admin/orders",
    "/admin/pricing",
    "/admin/products",
    "/admin/quotes",
    "/admin/reports",
    "/admin/settings",
    "/admin/suppliers",
    "/orders",
    "/orders/route-smoke-test",
  ])("registers the route %s", (path) => {
    const matches = makeRouter().matchRoutes(path as never);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each([
    { path: "/profile", routeId: "/profile" },
    { path: "/company/details", routeId: "/company/details" },
    { path: "/company/contacts", routeId: "/company/contacts" },
    { path: "/company/users", routeId: "/company/users" },
    { path: "/account/pending", routeId: "/account/pending" },
    { path: "/onboarding/company", routeId: "/onboarding/company" },
    { path: "/onboarding/profile", routeId: "/onboarding/profile" },
    { path: "/addresses", routeId: "/addresses" },
    { path: "/templates", routeId: "/templates" },
    { path: "/checkout/review", routeId: "/checkout_/review" },
    { path: "/checkout/confirm", routeId: "/checkout_/confirm" },
  ])("resolves $path to its intended file route", ({ path, routeId }) => {
    const matches = makeRouter().matchRoutes(path as never);
    expect(matches.some((match) => match.routeId === routeId)).toBe(true);
  });

  it.each([{"path":"/admin/workspace","id":"/admin_/workspace"},{"path":"/admin/catalog","id":"/admin_/catalog"},{"path":"/admin/data-center","id":"/admin_/data-center"},{"path":"/admin/import","id":"/admin_/import"},{"path":"/admin/import-logs","id":"/admin_/import-logs"},{"path":"/admin/onyx","id":"/admin_/onyx"},{"path":"/admin/ai/stock-sync","id":"/admin_/ai/stock-sync"},{"path":"/admin/ai/sync","id":"/admin_/ai/sync"},{"path":"/admin/finance-data","id":"/admin_/finance-data"},{"path":"/admin/ai/alerts","id":"/admin_/ai/alerts"},{"path":"/admin/ai/tasks","id":"/admin_/ai/tasks"},{"path":"/admin/ai/reports","id":"/admin_/ai/reports"},{"path":"/admin/ai/executive","id":"/admin_/ai/executive"},{"path":"/admin/order/11111111-1111-4111-8111-111111111111","id":"/admin_/order/$id"}])("resolves $path to its intended admin route", ({ path, id }) => {
    const matches = makeRouter().matchRoutes(path as never);
    expect(matches.some((match) => match.routeId === id)).toBe(true);
  });

  it.each([["/admin/images","/admin_/images"],["/admin/engines","/admin_/engines"],["/admin/ai/assistant","/admin_/ai/assistant"],["/admin/ai/governance","/admin_/ai/governance"],["/admin/ai/insights","/admin_/ai/insights"],["/admin/ai/prompts","/admin_/ai/prompts"],["/admin/ai/models","/admin_/ai/models"],["/admin/ai/settings","/admin_/ai/settings"],["/admin/ai/audit","/admin_/ai/audit"],["/admin/architecture","/admin_/architecture"],["/admin/audit","/admin_/audit"],["/admin/errors","/admin_/errors"],["/admin/health","/admin_/health"],["/admin/queues","/admin_/queues"],["/admin/invites","/admin_/invites"],["/admin/restore","/admin_/restore"],["/admin/dev-ai","/admin_/dev-ai"],["/admin/dev-ai/patches","/admin_/dev-ai/patches"],["/admin/dev-ai/audit","/admin_/dev-ai/audit"],["/admin/dev-ai/settings","/admin_/dev-ai/settings"],["/admin/users","/admin_/users"],["/admin/appearance","/admin_/appearance"]])("resolves the administration screen %s to its exact file route", (path, routeId) => {
    const matches = makeRouter().matchRoutes(path as never);
    expect(matches.at(-1)?.routeId).toBe(routeId);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

});
