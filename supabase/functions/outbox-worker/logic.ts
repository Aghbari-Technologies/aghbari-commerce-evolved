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
