import { describe, expect, it } from "vitest";
import {
  classifyOutboxProcessResult,
  sanitizeOutboxErrorMessage,
} from "../../supabase/functions/outbox-worker/logic";

describe("outbox worker logical RPC result handling", () => {
  it.each([
    [{ status: "processed" }, "processed"],
    [{ status: "already_processed" }, "processed"],
    [{ status: "retry", delay_seconds: 30 }, "retry"],
    [{ status: "dead_letter" }, "dead_letter"],
  ] as const)("recognizes terminal/transition status %#", (result, expected) => {
    expect(classifyOutboxProcessResult(result)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "processed",
    [],
    {},
    { status: "processing" },
    { status: "unknown" },
    { status: 200 },
  ])("rejects missing or unknown status %j so the worker can schedule failure handling", (result) => {
    expect(classifyOutboxProcessResult(result)).toBe("unexpected");
  });

  it("redacts emails, phone-like identifiers, URL tokens, secrets, and control characters from durable errors", () => {
    const unsafe = new Error(
      "failed for buyer@example.com +967 777 123 456; هاتف ٧٧٧ ١٢٣ ٤٥٦٧; Bearer secret-token api_key=provider-secret https://api.example.test/?access_token=query-secret\u0001",
    );
    const safe = sanitizeOutboxErrorMessage(unsafe);

    expect(safe).not.toContain("buyer@example.com");
    expect(safe).not.toContain("777 123 456");
    expect(safe).not.toContain("٧٧٧ ١٢٣ ٤٥٦٧");
    expect(safe).not.toContain("secret-token");
    expect(safe).not.toContain("provider-secret");
    expect(safe).not.toContain("query-secret");
    expect(safe).not.toContain("\u0001");
    expect(safe).toContain("[email redacted]");
    expect(safe).toContain("[number redacted]");
    expect(safe).toContain("[redacted]");
  });

  it("sanitizes Supabase RPC error objects and string messages without losing useful text", () => {
    const objectError = sanitizeOutboxErrorMessage({
      code: "XX000",
      message: "dispatch failed for buyer@example.com with Bearer provider-secret",
      details: "private provider response",
    });
    expect(objectError).toContain("dispatch failed");
    expect(objectError).toContain("[email redacted]");
    expect(objectError).not.toContain("buyer@example.com");
    expect(objectError).not.toContain("provider-secret");

    const stringError = sanitizeOutboxErrorMessage("provider api_key=provider-secret rejected request");
    expect(stringError).toContain("rejected request");
    expect(stringError).not.toContain("provider-secret");
    expect(sanitizeOutboxErrorMessage({ code: "XX000" })).toBe("Unclassified worker error");
  });

  it("provides a bounded, non-empty fallback for unknown worker errors", () => {
    expect(sanitizeOutboxErrorMessage(null)).toBe("Unclassified worker error");
    expect(sanitizeOutboxErrorMessage(new Error("x".repeat(700)))).toHaveLength(500);
  });
});
