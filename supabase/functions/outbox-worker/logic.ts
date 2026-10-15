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
    .replace(/\b(Bearer|service_role|anon_key|api[_-]?key|password|secret|access[_-]?token)\b[=: ]+\S+/gi, "$1=[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
    .replace(/(?:\+?[0-9٠-٩۰-۹][0-9٠-٩۰-۹\s().-]{6,}[0-9٠-٩۰-۹])/g, "[number redacted]")
    .replace(/([?&](?:access_token|refresh_token|token|api[_-]?key|key|password|secret)=)[^&\s]+/gi, "$1[redacted]")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .trim()
    .slice(0, 500);
}

export type BoundedRequestBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" | "read_failed" | "invalid_utf8" };

/**
 * Read untrusted worker request bytes with an actual memory bound. Checking text.length
 * only after request.text() has already buffered the entire request is not a size limit.
 */
export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<BoundedRequestBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error("maxBytes must be a non-negative safe integer");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\\d+$/.test(contentLength)) return { ok: false, reason: "read_failed" };
    if (Number(contentLength) > maxBytes) return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try { await reader.cancel(); } catch { /* Cancellation is best-effort after the limit is crossed. */ }
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "read_failed" };
  } finally {
    try { reader.releaseLock(); } catch { /* An already-cancelled stream may release itself. */ }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, reason: "invalid_utf8" };
  }
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
