import { normalizeCartDraft, type CartLineDraft } from "@/lib/commerce-utils";

const LEDGER_NAMESPACE = "aghbari:cart-ledger:v1:";
const LEGACY_CART_KEY = "aghbari:cart:v1";
const LEGACY_CART_OWNER_KEY = "aghbari:cart-owner:v1";
const MAX_CART_LINES = 1000;
const COMPACT_AFTER_OPERATIONS = 256;
const MAX_APPLIED_MUTATIONS = 20000;

export type OfflineCartMutationInput =
  | { id: string; kind: "adjust"; product_id: string; delta: number }
  | { id: string; kind: "set"; product_id: string; quantity: number }
  | { id: string; kind: "remove"; product_id: string }
  | { id: string; kind: "merge"; lines: CartLineDraft[] }
  | { id: string; kind: "clear" };

type SeedRecord = {
  version: 1;
  scope_key: string;
  id: "seed";
  kind: "seed";
  created_at: 0;
  lines: CartLineDraft[];
};

type CheckpointRecord = {
  version: 1;
  scope_key: string;
  id: string;
  kind: "checkpoint";
  created_at: number;
  lines: CartLineDraft[];
  applied_ids: string[];
  /** Backward-compatible payload fingerprints detect ID reuse after compaction. */
  applied_signatures?: Record<string, string>;
};

type MutationRecord = Omit<OfflineCartMutationInput, never> & {
  version: 1;
  scope_key: string;
  created_at: number;
};

type LedgerRecord = SeedRecord | CheckpointRecord | MutationRecord;

export type OfflineCartLedger = {
  scope_key: string;
  lines: CartLineDraft[];
  revision: number;
  mutation_count: number;
  operations_since_checkpoint: number;
  latest_mutation_at: number;
  applied_mutation_ids: string[];
  applied_mutation_signatures: Record<string, string>;
  ignored_operations: number;
};

export type LocalStorageLike = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

function encodeScope(scopeKey: string): string {
  return encodeURIComponent(scopeKey);
}

function prefixFor(scopeKey: string): string {
  return LEDGER_NAMESPACE + encodeScope(scopeKey) + ":";
}

function seedKey(scopeKey: string): string {
  return prefixFor(scopeKey) + "seed";
}

function operationPrefix(scopeKey: string): string {
  return prefixFor(scopeKey) + "op:";
}

function operationKey(scopeKey: string, id: string): string {
  return operationPrefix(scopeKey) + encodeURIComponent(id);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 128;
}

function validProductId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 128;
}

function normalizedLines(value: unknown): CartLineDraft[] {
  const lines = normalizeCartDraft(value);
  if (lines.length > MAX_CART_LINES) {
    throw new Error("عدد أصناف المسودة يتجاوز الحد الآمن للتخزين المحلي.");
  }
  return lines;
}

function normalizeAppliedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const id of value) {
    if (validId(id)) unique.add(id);
  }
  if (unique.size > MAX_APPLIED_MUTATIONS) {
    throw new Error("تجاوز سجل منع التكرار الحد الآمن؛ لم تُنفذ العملية المحلية.");
  }
  return [...unique];
}

function normalizeAppliedSignatures(value: unknown, ids: readonly string[]): Record<string, string> {
  if (!isPlainRecord(value)) return {};
  const allowed = new Set(ids);
  const signatures: Record<string, string> = {};
  for (const [id, signature] of Object.entries(value)) {
    if (allowed.has(id) && typeof signature === "string" && signature.length <= 64 && /^[a-z0-9-]+$/.test(signature)) {
      signatures[id] = signature;
    }
  }
  return signatures;
}

/** A deterministic accidental-collision guard; this is not an authentication primitive. */
function mutationSignature(mutation: OfflineCartMutationInput): string {
  let payload: unknown;
  switch (mutation.kind) {
    case "adjust": payload = ["adjust", mutation.product_id, mutation.delta]; break;
    case "set": payload = ["set", mutation.product_id, mutation.quantity]; break;
    case "remove": payload = ["remove", mutation.product_id]; break;
    case "clear": payload = ["clear"]; break;
    case "merge":
      payload = ["merge", normalizedLines(mutation.lines).map((line) => [line.product_id, line.quantity])];
      break;
  }
  const serialized = JSON.stringify(payload);
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (let index = 0; index < serialized.length; index++) {
    const code = serialized.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 2246822519);
  }
  return serialized.length.toString(36) + "-" +
    (first >>> 0).toString(16).padStart(8, "0") + "-" +
    (second >>> 0).toString(16).padStart(8, "0");
}

export function createOfflineCartScopeKey(profileId: string | null | undefined, origin?: string): string {
  const resolvedOrigin = (origin ?? (typeof location === "undefined" ? "unknown-origin" : location.origin)).trim();
  const resolvedProfile = typeof profileId === "string" && profileId.trim()
    ? "profile:" + profileId.trim()
    : "guest";
  if (!resolvedOrigin || resolvedOrigin.length > 512) throw new Error("نطاق المتجر المحلي غير صالح.");
  return resolvedOrigin + "::" + resolvedProfile;
}

export function getOfflineCartLedgerPrefix(scopeKey: string): string {
  return prefixFor(scopeKey);
}

export function getOfflineCatalogCacheKey(scopeKey: string): string {
  return "aghbari:catalog:v2:" + encodeScope(scopeKey);
}

export function isGuestCartScope(scopeKey: string): boolean {
  return scopeKey.endsWith("::guest");
}

/**
 * Read the legacy unscoped cart only when it is already owned by this scope.
 * A first migration may adopt only product IDs in the currently verified catalog.
 * Unknown product IDs are not replayed into another account or tenant.
 */
export function readLegacyCartDraftForScope(
  storage: LocalStorageLike,
  scopeKey: string,
  availableProductIds: readonly string[],
): { lines: CartLineDraft[]; ignoredLines: number } {
  let raw: unknown = [];
  try {
    const text = storage.getItem(LEGACY_CART_KEY);
    raw = text ? JSON.parse(text) as unknown : [];
  } catch {
    raw = [];
  }

  const legacyLines = normalizeCartDraft(raw);
  if (!legacyLines.length) return { lines: [], ignoredLines: 0 };

  const owner = storage.getItem(LEGACY_CART_OWNER_KEY);
  if (owner === scopeKey) return { lines: normalizedLines(legacyLines), ignoredLines: 0 };
  if (owner) return { lines: [], ignoredLines: legacyLines.length };

  if (isGuestCartScope(scopeKey)) {
    return { lines: normalizedLines(legacyLines), ignoredLines: 0 };
  }

  const available = new Set(availableProductIds.filter(validProductId));
  const lines = legacyLines.filter((line) => available.has(line.product_id));
  return { lines: normalizedLines(lines), ignoredLines: legacyLines.length - lines.length };
}

function makeSeed(scopeKey: string, lines: unknown): SeedRecord {
  return {
    version: 1,
    scope_key: scopeKey,
    id: "seed",
    kind: "seed",
    created_at: 0,
    lines: normalizedLines(lines),
  };
}

function parseStoredRecord(value: unknown, scopeKey: string): LedgerRecord | null {
  if (!isPlainRecord(value) || value.version !== 1 || value.scope_key !== scopeKey || !validId(value.id)) {
    return null;
  }
  if (value.kind === "seed" && value.id === "seed" && value.created_at === 0) {
    try {
      return { ...value, lines: normalizedLines(value.lines) } as SeedRecord;
    } catch {
      return null;
    }
  }
  if (value.kind === "checkpoint") {
    const createdAt = Number(value.created_at);
    if (!Number.isSafeInteger(createdAt) || createdAt < 0) return null;
    try {
      const appliedIds = normalizeAppliedIds(value.applied_ids);
      return {
        version: 1,
        scope_key: scopeKey,
        id: value.id,
        kind: "checkpoint",
        created_at: createdAt,
        lines: normalizedLines(value.lines),
        applied_ids: appliedIds,
        applied_signatures: normalizeAppliedSignatures(value.applied_signatures, appliedIds),
      };
    } catch {
      return null;
    }
  }

  const createdAt = Number(value.created_at);
  if (!Number.isSafeInteger(createdAt) || createdAt < 1) return null;
  if (value.kind === "adjust") {
    if (!validProductId(value.product_id) || !Number.isSafeInteger(value.delta) || value.delta === 0 || Math.abs(Number(value.delta)) > 10000) return null;
    return { ...(value as unknown as MutationRecord), created_at: createdAt } as MutationRecord;
  }
  if (value.kind === "set") {
    if (!validProductId(value.product_id) || !Number.isSafeInteger(value.quantity) || Number(value.quantity) < 0 || Number(value.quantity) > 10000) return null;
    return { ...(value as unknown as MutationRecord), created_at: createdAt } as MutationRecord;
  }
  if (value.kind === "remove") {
    if (!validProductId(value.product_id)) return null;
    return { ...(value as unknown as MutationRecord), created_at: createdAt } as MutationRecord;
  }
  if (value.kind === "merge") {
    try {
      return { ...(value as unknown as MutationRecord), lines: normalizedLines(value.lines), created_at: createdAt } as MutationRecord;
    } catch {
      return null;
    }
  }
  if (value.kind === "clear") {
    return { ...(value as unknown as MutationRecord), created_at: createdAt } as MutationRecord;
  }
  return null;
}

function compareRecords(left: { created_at: number; id: string }, right: { created_at: number; id: string }): number {
  return left.created_at - right.created_at || left.id.localeCompare(right.id);
}

function applyMutation(lines: CartLineDraft[], record: MutationRecord): CartLineDraft[] {
  if (record.kind === "clear") return [];
  if (record.kind === "remove") return lines.filter((line) => line.product_id !== record.product_id);
  if (record.kind === "merge") {
    const result = new Map(lines.map((line) => [line.product_id, line.quantity]));
    for (const addition of record.lines) {
      result.set(addition.product_id, Math.min(10000, (result.get(addition.product_id) ?? 0) + addition.quantity));
    }
    if (result.size > MAX_CART_LINES) throw new Error("تجاوزت السلة الحد الآمن لعدد الأصناف.");
    return [...result.entries()].map(([product_id, quantity]) => ({ product_id, quantity }));
  }

  const previous = lines.find((line) => line.product_id === record.product_id)?.quantity ?? 0;
  const quantity = record.kind === "adjust"
    ? Math.max(0, Math.min(10000, previous + record.delta))
    : record.quantity;
  const next = lines.filter((line) => line.product_id !== record.product_id);
  if (quantity > 0) next.push({ product_id: record.product_id, quantity });
  if (next.length > MAX_CART_LINES) throw new Error("تجاوزت السلة الحد الآمن لعدد الأصناف.");
  return next;
}

function listOperationRecords(storage: LocalStorageLike, scopeKey: string): { key: string; record: LedgerRecord | null }[] {
  const prefix = operationPrefix(scopeKey);
  const entries: { key: string; record: LedgerRecord | null }[] = [];
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key || !key.startsWith(prefix)) continue;
    let record: unknown;
    try {
      const serialized = storage.getItem(key);
      record = serialized ? JSON.parse(serialized) as unknown : null;
    } catch {
      record = null;
    }
    entries.push({ key, record: parseStoredRecord(record, scopeKey) });
  }
  return entries;
}

/**
 * The queue is a scoped append-only journal. Each mutation has its own storage key:
 * concurrent tabs never overwrite another tab's mutation. Replay is deterministic,
 * and quantity changes are relative operations so concurrent increments do not get lost.
 */
export function readOfflineCartLedger(
  storage: LocalStorageLike,
  scopeKey: string,
  initialLines: unknown = [],
): OfflineCartLedger {
  if (typeof scopeKey !== "string" || !scopeKey.trim() || scopeKey.length > 1024) {
    throw new Error("نطاق مسودة السلة غير صالح.");
  }

  const baseKey = seedKey(scopeKey);
  const seedText = storage.getItem(baseKey);
  if (!seedText) {
    storage.setItem(baseKey, JSON.stringify(makeSeed(scopeKey, initialLines)));
  }

  const persistedSeed = storage.getItem(baseKey);
  let seed: SeedRecord;
  try {
    seed = parseStoredRecord(persistedSeed ? JSON.parse(persistedSeed) as unknown : null, scopeKey) as SeedRecord;
    if (!seed || seed.kind !== "seed") throw new Error("seed_missing");
  } catch {
    throw new Error("تعذر التحقق من مسودة السلة المحلية؛ لم تُكتب أو تُرسل أي عملية.");
  }

  const parsed = listOperationRecords(storage, scopeKey);
  const ignoredOperations = parsed.filter((entry) => entry.record === null).length;
  const records = parsed
    .map((entry) => entry.record)
    .filter((record): record is LedgerRecord => record !== null)
    .sort(compareRecords);
  const checkpoints = records.filter((record): record is CheckpointRecord => record.kind === "checkpoint");
  // Prefer the most advanced checkpoint if concurrent tabs produce the same logical timestamp.
  // Prefer the checkpoint containing the largest incorporated journal set.
  // A later but partial concurrent checkpoint must not hide a richer checkpoint.
  const checkpoint = checkpoints.sort((left, right) =>
    right.applied_ids.length - left.applied_ids.length ||
    right.created_at - left.created_at ||
    right.id.localeCompare(left.id)
  )[0];
  let lines = checkpoint ? [...checkpoint.lines] : [...seed.lines];
  const applied = new Set<string>(checkpoint?.applied_ids ?? []);
  const signatures: Record<string, string> = { ...(checkpoint?.applied_signatures ?? {}) };
  let operationsSinceCheckpoint = 0;
  let latestMutationAt = checkpoints.reduce(
    (latest, item) => Math.max(latest, item.created_at),
    checkpoint?.created_at ?? 0,
  );

  for (const record of records) {
    if (record.kind === "seed" || record.kind === "checkpoint") continue;
    latestMutationAt = Math.max(latestMutationAt, record.created_at);
    const signature = mutationSignature(record);
    if (applied.has(record.id)) {
      const previousSignature = signatures[record.id];
      if (previousSignature && previousSignature !== signature) {
        throw new Error("تعارض معرّف تغيير السلة المحفوظ؛ لم تُستبدل المسودة الحالية.");
      }
      // Upgrade older checkpoints when the matching operation record is still available.
      if (!previousSignature) signatures[record.id] = signature;
      continue;
    }
    lines = applyMutation(lines, record);
    applied.add(record.id);
    signatures[record.id] = signature;
    operationsSinceCheckpoint++;
  }

  if (applied.size > MAX_APPLIED_MUTATIONS) {
    throw new Error("تجاوز سجل منع التكرار الحد الآمن؛ لم تُنفذ العملية المحلية.");
  }
  return {
    scope_key: scopeKey,
    lines,
    revision: applied.size,
    mutation_count: applied.size,
    operations_since_checkpoint: operationsSinceCheckpoint,
    latest_mutation_at: latestMutationAt,
    applied_mutation_ids: [...applied],
    applied_mutation_signatures: signatures,
    ignored_operations: ignoredOperations,
  };
}

function sameMutation(existing: LedgerRecord, requested: OfflineCartMutationInput): boolean {
  if (!("kind" in existing) || existing.id !== requested.id || existing.scope_key === "") return false;
  if (existing.kind !== requested.kind) return false;
  if (requested.kind === "adjust" && existing.kind === "adjust") return existing.product_id === requested.product_id && existing.delta === requested.delta;
  if (requested.kind === "set" && existing.kind === "set") return existing.product_id === requested.product_id && existing.quantity === requested.quantity;
  if (requested.kind === "remove" && existing.kind === "remove") return existing.product_id === requested.product_id;
  if (requested.kind === "clear" && existing.kind === "clear") return true;
  if (requested.kind === "merge" && existing.kind === "merge") return JSON.stringify(existing.lines) === JSON.stringify(normalizedLines(requested.lines));
  return false;
}

export function createOfflineCartMutationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "cart_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 16);
}

/** Stable, non-secret identity for one legacy draft payload being migrated across reloads. */
export function createStableOfflineCartMutationId(namespace: string, payload: unknown): string {
  const normalizedNamespace = namespace.trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 32) || "legacy";
  const serialized = JSON.stringify(payload);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return normalizedNamespace + "-" + (hash >>> 0).toString(16).padStart(8, "0") + "-" + serialized.length.toString(36);
}

export function appendOfflineCartMutation(
  storage: LocalStorageLike,
  scopeKey: string,
  mutation: OfflineCartMutationInput,
  initialLines: unknown = [],
): OfflineCartLedger {
  if (!validId(mutation.id)) throw new Error("معرّف تغيير السلة المحلي غير صالح.");
  const current = readOfflineCartLedger(storage, scopeKey, initialLines);
  const key = operationKey(scopeKey, mutation.id);
  const existingRaw = storage.getItem(key);
  if (existingRaw) {
    let parsed: LedgerRecord | null = null;
    try {
      parsed = parseStoredRecord(JSON.parse(existingRaw) as unknown, scopeKey);
    } catch {
      parsed = null;
    }
    if (!parsed || !sameMutation(parsed, mutation)) {
      throw new Error("تعارض معرّف تغيير السلة؛ لم تُستبدل المسودة الحالية.");
    }
    return current;
  }
  if (current.applied_mutation_ids.includes(mutation.id)) {
    const priorSignature = current.applied_mutation_signatures[mutation.id];
    if (priorSignature && priorSignature !== mutationSignature(mutation)) {
      throw new Error("تعارض معرّف تغيير السلة؛ استُخدم هذا المعرّف سابقًا لمحتوى مختلف.");
    }
    return current;
  }
  if (current.mutation_count >= MAX_APPLIED_MUTATIONS) {
    throw new Error("وصل سجل السلة المحلي إلى حد منع التكرار؛ اتصل بالإنترنت وأكمل أو راجع المسودة قبل بدء مسودة جديدة.");
  }

  const createdAt = Math.max(Date.now(), current.latest_mutation_at + 1);
  const record = { ...mutation, version: 1, scope_key: scopeKey, created_at: createdAt } as MutationRecord;
  const validated = parseStoredRecord(record, scopeKey);
  if (!validated || validated.kind === "seed" || validated.kind === "checkpoint") {
    throw new Error("تعذر التحقق من تغيير السلة؛ لم تُحفظ العملية.");
  }

  storage.setItem(key, JSON.stringify(validated));
  let result = readOfflineCartLedger(storage, scopeKey, initialLines);
  if (result.operations_since_checkpoint >= COMPACT_AFTER_OPERATIONS) {
    result = compactOfflineCartLedger(storage, scopeKey, initialLines);
  }
  return result;
}

/**
 * Compaction writes a full state checkpoint first, then removes only operations at
 * or before its timestamp. New concurrent-tab writes always use a later timestamp
 * and are retained. Applied IDs remain in the checkpoint so retries are idempotent.
 */
export function compactOfflineCartLedger(
  storage: LocalStorageLike,
  scopeKey: string,
  initialLines: unknown = [],
): OfflineCartLedger {
  const current = readOfflineCartLedger(storage, scopeKey, initialLines);
  if (current.operations_since_checkpoint === 0) return current;
  if (current.applied_mutation_ids.length > MAX_APPLIED_MUTATIONS) {
    throw new Error("تعذر ضغط سجل السلة بأمان؛ تجاوز سجل منع التكرار الحد المسموح.");
  }

  const checkpoint: CheckpointRecord = {
    version: 1,
    scope_key: scopeKey,
    id: createOfflineCartMutationId(),
    kind: "checkpoint",
    // Advance the checkpoint clock beyond every mutation in the snapshot.
    created_at: Math.max(Date.now(), current.latest_mutation_at + 1),
    lines: current.lines,
    applied_ids: current.applied_mutation_ids,
    applied_signatures: current.applied_mutation_signatures,
  };
  storage.setItem(operationKey(scopeKey, checkpoint.id), JSON.stringify(checkpoint));

  const currentIds = new Set(current.applied_mutation_ids);
  const currentSignatures = current.applied_mutation_signatures;
  const checkpointCoversCurrent = (candidate: CheckpointRecord): boolean => {
    if (!candidate.applied_ids.every((id) => currentIds.has(id))) return false;
    for (const [id, candidateSignature] of Object.entries(candidate.applied_signatures ?? {})) {
      const currentSignature = currentSignatures[id];
      if (currentSignature && currentSignature !== candidateSignature) return false;
    }
    return true;
  };

  // Concurrent tabs may leave partial checkpoints with different applied-ID sets.
  // Keep any checkpoint not fully represented by our snapshot; removing it could lose
  // the only surviving materialization of an operation whose journal record was removed.
  for (const entry of listOperationRecords(storage, scopeKey)) {
    const record = entry.record;
    if (!record || record.id === checkpoint.id || record.kind !== "checkpoint") continue;
    if (checkpointCoversCurrent(record)) storage.removeItem(entry.key);
  }

  // Re-read after checkpoint pruning. An operation is safe to delete only when every
  // retained checkpoint includes its ID (and no available signature contradicts it).
  const retainedCheckpoints = listOperationRecords(storage, scopeKey)
    .map((entry) => entry.record)
    .filter((record): record is CheckpointRecord => record?.kind === "checkpoint");
  for (const entry of listOperationRecords(storage, scopeKey)) {
    const record = entry.record;
    if (!record || record.kind === "seed" || record.kind === "checkpoint") continue;
    if (!currentIds.has(record.id)) continue;
    const coveredByEveryCheckpoint = retainedCheckpoints.every((item) => {
      if (!item.applied_ids.includes(record.id)) return false;
      const checkpointSignature = item.applied_signatures?.[record.id];
      const mutationSignatureValue = currentSignatures[record.id];
      return !checkpointSignature || !mutationSignatureValue || checkpointSignature === mutationSignatureValue;
    });
    if (coveredByEveryCheckpoint) storage.removeItem(entry.key);
  }

  const compacted = readOfflineCartLedger(storage, scopeKey, current.lines);
  return compacted;
}

export function subscribeToOfflineCartLedger(
  scopeKey: string,
  onChange: () => void,
  eventTarget: Pick<Window, "addEventListener" | "removeEventListener"> = window,
): () => void {
  const prefix = prefixFor(scopeKey);
  const listener = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key?.startsWith(prefix) || storageEvent.key === seedKey(scopeKey)) onChange();
  };
  eventTarget.addEventListener("storage", listener as EventListener);
  return () => eventTarget.removeEventListener("storage", listener as EventListener);
}

export function legacyCartOwnerScope(storage: LocalStorageLike): string | null {
  return storage.getItem(LEGACY_CART_OWNER_KEY);
}

export function legacyCartDraft(storage: LocalStorageLike): CartLineDraft[] {
  try {
    return normalizeCartDraft(JSON.parse(storage.getItem(LEGACY_CART_KEY) || "[]") as unknown);
  } catch {
    return [];
  }
}

export function writeLegacyCartOwner(storage: LocalStorageLike, scopeKey: string): void {
  storage.setItem(LEGACY_CART_OWNER_KEY, scopeKey);
}
