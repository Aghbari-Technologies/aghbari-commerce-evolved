import { describe, expect, it, vi } from "vitest";
import {
  appendOfflineCartMutation,
  compactOfflineCartLedger,
  createOfflineCartScopeKey,
  createStableOfflineCartMutationId,
  getOfflineCartLedgerPrefix,
  getOfflineCatalogCacheKey,
  getOfflineCatalogSyncTimestampKey,
  getOfflineCartRestoreEpochKey,
  readLegacyCartDraftForScope,
  readOfflineCartLedger,
  subscribeToOfflineCartLedger,
  subscribeToOfflineCartState,
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

class RacingStorage extends MemoryStorage {
  onCheckpoint: ((checkpoint: Record<string, unknown>) => void) | null = null;
  private injected = false;

  setItem(key: string, value: string) {
    super.setItem(key, value);
    let record: unknown;
    try { record = JSON.parse(value); } catch { return; }
    if (!this.injected && record && typeof record === "object" &&
        (record as { kind?: unknown }).kind === "checkpoint" && this.onCheckpoint) {
      this.injected = true;
      this.onCheckpoint(record as Record<string, unknown>);
    }
  }
}

function mutation(input: Omit<OfflineCartMutationInput, "id"> & { id?: string }): OfflineCartMutationInput {
  const id = input.id ?? "mutation-" + Math.random().toString(36).slice(2, 12);
  return { ...input, id } as OfflineCartMutationInput;
}

describe("scoped durable offline cart mutation journal", () => {
  it("uses a stable operation ID for the same legacy restore payload", () => {
    const payload = [{ product_id: "p1", quantity: 2 }];
    expect(createStableOfflineCartMutationId("legacy-restore", payload))
      .toBe(createStableOfflineCartMutationId("legacy-restore", payload));
    expect(createStableOfflineCartMutationId("legacy-restore", payload))
      .not.toBe(createStableOfflineCartMutationId("legacy-restore", [{ product_id: "p1", quantity: 3 }]));
  });

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

  it("scopes restore-generation metadata by account and origin", () => {
    const accountA = createOfflineCartScopeKey("profile-a", "https://tenant-a.example");
    const accountB = createOfflineCartScopeKey("profile-b", "https://tenant-a.example");
    const tenantB = createOfflineCartScopeKey("profile-a", "https://tenant-b.example");
    const key = getOfflineCartRestoreEpochKey(accountA);
    expect(key).not.toBe(getOfflineCartRestoreEpochKey(accountB));
    expect(key).not.toBe(getOfflineCartRestoreEpochKey(tenantB));
    expect(key).toMatch(/^aghbari:cart-restore-epoch:v1:/);
  });

  it("scopes catalog sync freshness timestamps by account and origin", () => {
    const accountA = createOfflineCartScopeKey("profile-a", "https://tenant-a.example");
    const accountB = createOfflineCartScopeKey("profile-b", "https://tenant-a.example");
    const tenantB = createOfflineCartScopeKey("profile-a", "https://tenant-b.example");
    const keyA = getOfflineCatalogSyncTimestampKey(accountA);
    expect(keyA).not.toBe(getOfflineCatalogSyncTimestampKey(accountB));
    expect(keyA).not.toBe(getOfflineCatalogSyncTimestampKey(tenantB));
    expect(keyA).toMatch(/^aghbari:catalog-synced-at:v1:/);
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


  it("preserves a concurrent write during compaction even when its timestamp ties the snapshot", () => {
    const storage = new RacingStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    appendOfflineCartMutation(storage, scope, { id: "before-checkpoint", kind: "adjust", product_id: "p1", delta: 1 });
    const snapshotTimestamp = readOfflineCartLedger(storage, scope).latest_mutation_at;
    storage.onCheckpoint = () => {
      const racingRecord = {
        version: 1,
        scope_key: scope,
        id: "concurrent-adjust",
        kind: "adjust",
        product_id: "p1",
        delta: 4,
        created_at: snapshotTimestamp,
      };
      storage.setItem(
        getOfflineCartLedgerPrefix(scope) + "op:" + encodeURIComponent("concurrent-adjust"),
        JSON.stringify(racingRecord),
      );
    };

    const compacted = compactOfflineCartLedger(storage, scope);
    expect(compacted.lines).toEqual([{ product_id: "p1", quantity: 5 }]);
    expect(compacted.applied_mutation_ids).toContain("concurrent-adjust");
  });

  it("retains mutations represented by competing partial checkpoints during compaction", () => {
    const storage = new RacingStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    appendOfflineCartMutation(storage, scope, {
      id: "initial-operation",
      kind: "adjust",
      product_id: "p1",
      delta: 1,
    });

    storage.onCheckpoint = (checkpoint) => {
      const checkpointTime = Number(checkpoint.created_at);
      // A second tab finished a checkpoint from a different snapshot: this one contains
      // only its own new operation. Its timestamp is later, but its applied-ID set is partial.
      storage.setItem(
        getOfflineCartLedgerPrefix(scope) + "op:" + encodeURIComponent("concurrent-operation"),
        JSON.stringify({
          version: 1,
          scope_key: scope,
          id: "concurrent-operation",
          kind: "adjust",
          product_id: "p2",
          delta: 4,
          created_at: checkpointTime,
        }),
      );
      storage.setItem(
        getOfflineCartLedgerPrefix(scope) + "op:" + encodeURIComponent("racing-checkpoint"),
        JSON.stringify({
          version: 1,
          scope_key: scope,
          id: "racing-checkpoint",
          kind: "checkpoint",
          created_at: checkpointTime + 10,
          lines: [{ product_id: "p2", quantity: 4 }],
          applied_ids: ["concurrent-operation"],
        }),
      );
    };

    const compacted = compactOfflineCartLedger(storage, scope);
    expect(compacted.lines).toEqual([
      { product_id: "p2", quantity: 4 },
      { product_id: "p1", quantity: 1 },
    ]);
    expect(compacted.applied_mutation_ids).toContain("initial-operation");
    expect(compacted.applied_mutation_ids).toContain("concurrent-operation");
    expect(storage.getItem(getOfflineCartLedgerPrefix(scope) + "op:" + encodeURIComponent("initial-operation"))).not.toBeNull();
  });

  it("refreshes scoped cart/catalog changes across tabs and after localStorage.clear", () => {
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    const otherScope = createOfflineCartScopeKey("profile-b", "https://store.example");
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: (type: string, listener: EventListener) => { listeners.set(type, listener); },
      removeEventListener: (type: string, listener: EventListener) => {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
    } as Pick<Window, "addEventListener" | "removeEventListener">;
    const onChange = vi.fn();
    const unsubscribe = subscribeToOfflineCartState(scope, onChange, target);
    const handler = listeners.get("storage");
    expect(handler).toBeDefined();

    handler?.({ key: getOfflineCartLedgerPrefix(scope) + "op:one" } as StorageEvent);
    handler?.({ key: getOfflineCatalogCacheKey(scope) } as StorageEvent);
    handler?.({ key: getOfflineCatalogSyncTimestampKey(scope) } as StorageEvent);
    handler?.({ key: getOfflineCatalogCacheKey(otherScope) } as StorageEvent);
    handler?.({ key: null } as StorageEvent);
    expect(onChange).toHaveBeenCalledTimes(4);

    unsubscribe();
    expect(listeners.has("storage")).toBe(false);
  });

  it("rejects reuse of a compacted mutation ID with a different payload", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    const original = mutation({ id: "compacted-collision", kind: "adjust", product_id: "p1", delta: 1 });
    appendOfflineCartMutation(storage, scope, original);
    compactOfflineCartLedger(storage, scope);

    expect(() => appendOfflineCartMutation(
      storage,
      scope,
      mutation({ id: "compacted-collision", kind: "adjust", product_id: "p1", delta: 2 }),
    )).toThrow(/تعارض معرّف تغيير السلة/);
    expect(readOfflineCartLedger(storage, scope).lines).toEqual([{ product_id: "p1", quantity: 1 }]);
  });

  it("fails closed when a legacy checkpoint cannot verify an already-applied mutation body", () => {
    const storage = new MemoryStorage();
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    const applied = mutation({ id: "legacy-checkpoint-operation", kind: "adjust", product_id: "p1", delta: 1 });
    appendOfflineCartMutation(storage, scope, applied);
    compactOfflineCartLedger(storage, scope);

    const checkpointKey = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .find((key) => {
        if (!key?.startsWith(getOfflineCartLedgerPrefix(scope) + "op:")) return false;
        try { return JSON.parse(storage.getItem(key) || "null").kind === "checkpoint"; } catch { return false; }
      });
    expect(checkpointKey).toBeDefined();
    const checkpoint = JSON.parse(storage.getItem(checkpointKey!) || "null");
    delete checkpoint.applied_signatures;
    storage.setItem(checkpointKey!, JSON.stringify(checkpoint));

    expect(() => appendOfflineCartMutation(
      storage,
      scope,
      mutation({ id: "legacy-checkpoint-operation", kind: "adjust", product_id: "p1", delta: 99 }),
    )).toThrow(/نقطة استئناف قديمة/);
    expect(readOfflineCartLedger(storage, scope).lines).toEqual([{ product_id: "p1", quantity: 1 }]);
  });

  it("refreshes on this cart scope storage events and ignores unrelated keys", () => {
    const scope = createOfflineCartScopeKey("profile-a", "https://store.example");
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: (type: string, listener: EventListener) => { listeners.set(type, listener); },
      removeEventListener: (type: string, listener: EventListener) => {
        if (listeners.get(type) === listener) listeners.delete(type);
      },
    } as Pick<Window, "addEventListener" | "removeEventListener">;
    const onChange = vi.fn();
    const unsubscribe = subscribeToOfflineCartLedger(scope, onChange, target);
    const handler = listeners.get("storage");
    expect(handler).toBeDefined();

    handler?.({ key: getOfflineCartLedgerPrefix(scope) + "op:changed" } as StorageEvent);
    handler?.({ key: "aghbari:catalog:v2:another-scope" } as StorageEvent);
    handler?.({ key: null } as StorageEvent);
    expect(onChange).toHaveBeenCalledOnce();

    unsubscribe();
    expect(listeners.has("storage")).toBe(false);
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
