import { describe, expect, it } from "vitest";
import {
  appendOfflineCartMutation,
  compactOfflineCartLedger,
  createOfflineCartScopeKey,
  readLegacyCartDraftForScope,
  readOfflineCartLedger,
  type LocalStorageLike,
  type OfflineCartMutationInput,
} from "@/lib/offline-cart-ledger";

class MemoryStorage implements LocalStorageLike {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
}

function mutation(input: Omit<OfflineCartMutationInput, "id"> & { id?: string }): OfflineCartMutationInput {
  const id = input.id ?? "mutation-" + Math.random().toString(36).slice(2, 12);
  return { ...input, id } as OfflineCartMutationInput;
}

describe("scoped durable offline cart mutation journal", () => {
  it("applies increments exactly once and survives replay after reload", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    const seed = [{ product_id: "p1", quantity: 2 }];
    readOfflineCartLedger(storage, scope, seed);

    const increment = mutation({ id: "add-one", kind: "adjust", product_id: "p1", delta: 1 });
    expect(appendOfflineCartMutation(storage, scope, increment).lines).toEqual([{ product_id: "p1", quantity: 3 }]);
    expect(appendOfflineCartMutation(storage, scope, increment).lines).toEqual([{ product_id: "p1", quantity: 3 }]);
    expect(readOfflineCartLedger(storage, scope).lines).toEqual([{ product_id: "p1", quantity: 3 }]);
  });

  it("retains independent mutations from multiple tabs instead of overwriting a shared snapshot", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    readOfflineCartLedger(storage, scope, [{ product_id: "p1", quantity: 1 }]);

    appendOfflineCartMutation(storage, scope, mutation({ id: "tab-a-add", kind: "adjust", product_id: "p1", delta: 2 }));
    appendOfflineCartMutation(storage, scope, mutation({ id: "tab-b-add", kind: "adjust", product_id: "p1", delta: 3 }));
    expect(readOfflineCartLedger(storage, scope).lines).toEqual([{ product_id: "p1", quantity: 6 }]);
  });

  it("merges reorder lines once and keeps removal/clear operations deterministic", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    readOfflineCartLedger(storage, scope, [{ product_id: "p1", quantity: 4 }]);

    const merge = mutation({
      id: "reorder-template-1",
      kind: "merge",
      lines: [{ product_id: "p1", quantity: 2 }, { product_id: "p2", quantity: 3 }],
    });
    expect(appendOfflineCartMutation(storage, scope, merge).lines).toEqual([
      { product_id: "p1", quantity: 6 },
      { product_id: "p2", quantity: 3 },
    ]);
    expect(appendOfflineCartMutation(storage, scope, merge).lines).toHaveLength(2);
    expect(appendOfflineCartMutation(storage, scope, mutation({ id: "remove-p1", kind: "remove", product_id: "p1" })).lines)
      .toEqual([{ product_id: "p2", quantity: 3 }]);
    expect(appendOfflineCartMutation(storage, scope, mutation({ id: "clear-cart", kind: "clear" })).lines).toEqual([]);
  });

  it("isolates local mutations by profile and origin", () => {
    const storage = new MemoryStorage();
    const accountA = createOfflineCartScopeKey("profile-a", "https://tenant-a.example");
    const accountB = createOfflineCartScopeKey("profile-b", "https://tenant-a.example");
    const tenantB = createOfflineCartScopeKey("profile-a", "https://tenant-b.example");
    readOfflineCartLedger(storage, accountA, [{ product_id: "p1", quantity: 2 }]);
    readOfflineCartLedger(storage, accountB, [{ product_id: "p2", quantity: 4 }]);
    readOfflineCartLedger(storage, tenantB, [{ product_id: "p3", quantity: 5 }]);
    appendOfflineCartMutation(storage, accountA, mutation({ id: "only-account-a", kind: "adjust", product_id: "p1", delta: 1 }));

    expect(readOfflineCartLedger(storage, accountA).lines).toEqual([{ product_id: "p1", quantity: 3 }]);
    expect(readOfflineCartLedger(storage, accountB).lines).toEqual([{ product_id: "p2", quantity: 4 }]);
    expect(readOfflineCartLedger(storage, tenantB).lines).toEqual([{ product_id: "p3", quantity: 5 }]);
  });

  it("compacts applied operations without losing state or re-applying a stale retry ID", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    readOfflineCartLedger(storage, scope, []);
    const restore = mutation({
      id: "durable-restore-id",
      kind: "merge",
      lines: [{ product_id: "p1", quantity: 2 }],
    });
    appendOfflineCartMutation(storage, scope, restore);
    for (let index = 0; index < 275; index++) {
      appendOfflineCartMutation(storage, scope, mutation({ kind: "adjust", product_id: "p1", delta: 1 }));
    }
    const compacted = compactOfflineCartLedger(storage, scope);
    expect(compacted.lines).toEqual([{ product_id: "p1", quantity: 277 }]);
    const retried = appendOfflineCartMutation(storage, scope, restore);
    expect(retried.lines).toEqual([{ product_id: "p1", quantity: 277 }]);
    expect(retried.operations_since_checkpoint).toBe(0);
  });

  it("rejects reuse of an active mutation ID with a different payload", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    readOfflineCartLedger(storage, scope, []);
    appendOfflineCartMutation(storage, scope, mutation({ id: "collision", kind: "adjust", product_id: "p1", delta: 1 }));
    expect(() => appendOfflineCartMutation(storage, scope, mutation({ id: "collision", kind: "adjust", product_id: "p1", delta: 2 })))
      .toThrow(/تعارض معرّف تغيير السلة/);
  });

  it("will not import a legacy cart owned by another profile or unknown product IDs into a signed-in tenant", () => {
    const storage = new MemoryStorage();
    storage.setItem("aghbari:cart:v1", JSON.stringify([
      { product_id: "same-product", quantity: 2 },
      { product_id: "foreign-product", quantity: 4 },
    ]));
    storage.setItem("aghbari:cart-owner:v1", "https://store.example::profile:someone-else");
    expect(readLegacyCartDraftForScope(storage, "https://store.example::profile:profile-a", ["same-product"]))
      .toEqual({ lines: [], ignoredLines: 2 });

    storage.removeItem("aghbari:cart-owner:v1");
    expect(readLegacyCartDraftForScope(storage, "https://store.example::profile:profile-a", ["same-product"]))
      .toEqual({ lines: [{ product_id: "same-product", quantity: 2 }], ignoredLines: 1 });
  });
});
