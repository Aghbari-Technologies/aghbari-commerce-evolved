import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

const invitationToken = "a".repeat(64);

describe("company invitation URL contract", () => {
  it("keeps the existing acceptance route accessible without a query token", async () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/company/accept-invitation"] }),
    });

    await router.load();

    expect(router.state.location.pathname).toBe("/company/accept-invitation");
    expect(router.state.location.search).toEqual({});
  });

  it("normalizes a path-token invite to the existing server-validated acceptance route", async () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/invite/" + invitationToken] }),
    });

    await router.load();

    expect(router.state.location.pathname).toBe("/company/accept-invitation");
    expect(router.state.location.search).toMatchObject({ token: invitationToken });
  });
});
