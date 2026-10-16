/**
 * Keep error text useful but prevent personal contact details and provider secrets
 * from being copied into the durable outbox error ledger.
 */
export function sanitizeOutboxErrorMessage(value: unknown): string {
  let raw = "Unclassified worker error";
  if (value instanceof Error) {
    raw = value.message;
  } else if (typeof value === "string") {
    raw = value;
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    const message = (value as Record<string, unknown>).message;
    if (typeof message === "string") raw = message;
  }
  return raw
    .replace(/\b(authorization|proxy-authorization)\s*[:=][^\r\n]*/gi, "[authorization redacted]")
    .replace(/\b(cookie|set-cookie)\s*[:=]\s*[^\r\n]+/gi, "[cookie redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[token redacted]")
    .replace(/(?<!\[)\b(Bearer|service_role|anon_key|api[_-]?key|client[_-]?secret|password|secret|access[_-]?token|refresh[_-]?token|id[_-]?token|credential)\b[=: ]+[^&\s]+/gi, "$1=[redacted]")
    .replace(/\b(sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,})\b/g, "[secret redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
    .replace(/(?:\+?[0-9٠-٩۰-۹][0-9٠-٩۰-۹\s().-]{6,}[0-9٠-٩۰-۹])/g, "[number redacted]")
    .replace(/([?&#](?:access[_-]?token|refresh[_-]?token|id[_-]?token|authorization[_-]?code|oauth[_-]?code|client[_-]?secret|credential|token|api[_-]?key|key|password|secret|code)=)[^&#\s]+/gi, "$1[redacted]")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .trim()
    .slice(0, 500);
}

export { readBoundedRequestBody, type BoundedRequestBodyResult } from "../_shared/bounded-request.ts";

export type OutboxBatchSizeResult =
  | { ok: true; batch_size: number }
  | { ok: false; reason: "invalid_shape" | "invalid_batch_size" };

/** A non-object payload must never silently turn into a default-size worker run. */
export function parseOutboxBatchSize(payload: unknown): OutboxBatchSizeResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "invalid_shape" };
  }
  const requested = (payload as Record<string, unknown>).batch_size;
  const batchSize = requested === undefined ? 20 : requested;
  if (!Number.isInteger(batchSize) || Number(batchSize) < 1 || Number(batchSize) > 50) {
    return { ok: false, reason: "invalid_batch_size" };
  }
  return { ok: true, batch_size: Number(batchSize) };
}

export type ClaimedOutboxEvent = { id: string; event_type: string; attempts: number };

export type ClaimedOutboxEventsResult =
  | { ok: true; events: ClaimedOutboxEvent[] }
  | { ok: false; reason: "invalid_batch" | "invalid_event" };

/** Validate the entire claim response before dispatching any item. */
export function parseClaimedOutboxEvents(value: unknown): ClaimedOutboxEventsResult {
  if (!Array.isArray(value)) return { ok: false, reason: "invalid_batch" };
  const events: ClaimedOutboxEvent[] = [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, reason: "invalid_event" };
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id) ||
      typeof row.event_type !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_.-]{0,99}$/.test(row.event_type) ||
      !Number.isSafeInteger(row.attempts) ||
      Number(row.attempts) < 1 ||
      Number(row.attempts) > 8 ||
      ids.has(row.id.toLowerCase())
    ) {
      return { ok: false, reason: "invalid_event" };
    }
    ids.add(row.id.toLowerCase());
    events.push({ id: row.id, event_type: row.event_type, attempts: Number(row.attempts) });
  }
  return { ok: true, events };
}

export type OutboxProcessOutcome = "processed" | "retry" | "dead_letter" | "unexpected";

/**
 * Validate the logical result of the process RPC.
 * A successful network/RPC envelope without a recognized status is not a completed event.
 */
export function classifyOutboxProcessResult(value: unknown): OutboxProcessOutcome {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "unexpected";
  const status = (value as Record<string, unknown>).status;
  if (status === "processed" || status === "already_processed") return "processed";
  if (status === "retry") return "retry";
  if (status === "dead_letter") return "dead_letter";
  return "unexpected";
}
