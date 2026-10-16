import {
  readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe,
  expect,
  it } from "vitest";
import {
  classifyOutboxProcessResult,
  parseClaimedOutboxEvents,
  readBoundedRequestBody,
  sanitizeOutboxErrorMessage,
  parseOutboxBatchSize,
} from "../../supabase/functions/outbox-worker/logic";

describe("outbox worker logical RPC result handling", () => {
  it("rejects non-object worker request bodies rather than defaulting them", () => {
    expect(parseOutboxBatchSize({})).toEqual({ ok: true, batch_size: 20 });
    expect(parseOutboxBatchSize({ batch_size: 1 })).toEqual({ ok: true, batch_size: 1 });
    expect(parseOutboxBatchSize({ batch_size: 50 })).toEqual({ ok: true, batch_size: 50 });
    for (const payload of [null, [], "20", 20, true]) {
      expect(parseOutboxBatchSize(payload)).toEqual({ ok: false, reason: "invalid_shape" });
    }
    for (const batch_size of [0, -1, 51, "20", null, 1.5]) {
      expect(parseOutboxBatchSize({ batch_size })).toEqual({ ok: false, reason: "invalid_batch_size" });
    }
  });

  it("accepts only a complete, unique and bounded outbox claim batch", () => {
    expect(parseClaimedOutboxEvents([])).toEqual({ ok: true, events: [] });
    expect(parseClaimedOutboxEvents([{
      id: "11111111-1111-4111-8111-111111111111",
      event_type: "OrderCreated",
      attempts: 1,
    }])).toEqual({
      ok: true,
      events: [{
        id: "11111111-1111-4111-8111-111111111111",
        event_type: "OrderCreated",
        attempts: 1,
      }],
    });
    expect(parseClaimedOutboxEvents(null)).toEqual({ ok: false, reason: "invalid_batch" });
    expect(parseClaimedOutboxEvents({ rows: [] })).toEqual({ ok: false, reason: "invalid_batch" });
    expect(parseClaimedOutboxEvents([{
      id: "not-a-uuid", event_type: "OrderCreated", attempts: 1,
    }])).toEqual({ ok: false, reason: "invalid_event" });
    expect(parseClaimedOutboxEvents([{
      id: "11111111-1111-4111-8111-111111111111", event_type: "OrderCreated", attempts: 9,
    }])).toEqual({ ok: false, reason: "invalid_event" });
    expect(parseClaimedOutboxEvents([
      { id: "11111111-1111-4111-8111-111111111111", event_type: "OrderCreated", attempts: 1 },
      { id: "11111111-1111-4111-8111-111111111111", event_type: "OrderCreated", attempts: 2 },
    ])).toEqual({ ok: false, reason: "invalid_event" });
  });


  it("bounds worker request reads before buffering an oversized body", async () => {
    const oversized = new Request("https://worker.example", {
      method: "POST",
      body: "x".repeat(4097),
    });
    await expect(readBoundedRequestBody(oversized, 4096)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects oversized and malformed declared content lengths before reading", async () => {
    const validDeclaredLength = new Request("https://worker.example", {
      method: "POST",
      body: "json",
      headers: { "content-length": "4" },
    });
    await expect(readBoundedRequestBody(validDeclaredLength, 4)).resolves.toEqual({
      ok: true,
      text: "json",
    });

    const tooLarge = {
      headers: new Headers({ "content-length": "4097" }),
      body: null,
    } as unknown as Request;
    await expect(readBoundedRequestBody(tooLarge, 4096)).resolves.toEqual({
      ok: false,
      reason: "too_large",
    });

    const malformed = {
      headers: new Headers({ "content-length": "four-kilobytes" }),
      body: null,
    } as unknown as Request;
    await expect(readBoundedRequestBody(malformed, 4096)).resolves.toEqual({
      ok: false,
      reason: "read_failed",
    });
  });

  it("accepts a body exactly at the byte limit and rejects invalid UTF-8", async () => {
    const exactLimit = new Request("https://worker.example", {
      method: "POST",
      body: "x".repeat(4096),
    });
    await expect(readBoundedRequestBody(exactLimit, 4096)).resolves.toEqual({
      ok: true,
      text: "x".repeat(4096),
    });

    const invalidUtf8 = new Request("https://worker.example", {
      method: "POST",
      body: new Uint8Array([0xff, 0xfe]),
    });
    await expect(readBoundedRequestBody(invalidUtf8, 4096)).resolves.toEqual({
      ok: false,
      reason: "invalid_utf8",
    });
  });

  it("keeps the Edge worker retry failure path connected to the tested sanitizer", async () => {
    const source = await readFile(
      resolve(process.cwd(), "supabase/functions/outbox-worker/index.ts"),
      "utf8",
    );
    expect(source).toMatch(/import\s*\{[^}]*sanitizeOutboxErrorMessage[^}]*\}\s*from\s*["']\.\/logic\.ts["']/s);
    expect(source).toContain("sanitizeOutboxErrorMessage(error)");
    expect(source).toContain("readBoundedRequestBody(request, 4096)");
    expect(source).toContain("parseClaimedOutboxEvents(claimedRows)");
    expect(source).not.toContain("request.text()");
    expect(source).not.toMatch(/\(claimedRows \?\? \[\]\) as/);
    expect(source).toContain("outbox_process_transport_error");
    expect(source).toContain("outbox_failure_transport_error");
    expect(source).toContain("failures > 0 ? 503 : 200");
    expect(source).toContain('return json({ error: "claim_failed" }, 503, { "retry-after": "30" });');
    expect(source).toContain("retryAfterSeconds = Math.max(retryAfterSeconds, 300)");
    expect(source).toContain('failures > 0 ? { "retry-after": String(retryAfterSeconds) } : {}');
    expect(source).toContain("claim_transport_failed");
    expect(source).toContain("catch (cause)");
    expect(source).toMatch(/catch\s*\(cause\)[\s\S]*outbox_process_transport_error/);
    expect(source).toMatch(/catch\s*\(cause\)[\s\S]*outbox_failure_transport_error/);
    expect(source).not.toMatch(/\bsafeErrorMessage\s*\(/);
  });

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

  it("redacts authorization headers, cookies, JWTs and common provider key shapes", () => {
    const value = sanitizeOutboxErrorMessage(new Error(
      "Authorization: Bearer opaque-access-token\nCookie: session=private-cookie; next=ignored\neyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signed-token\nsk-12345678901234567890\nAIza123456789012345678901234567890",
    ));
    expect(value).not.toContain("opaque-access-token");
    expect(value).not.toContain("private-cookie");
    expect(value).not.toContain("next=ignored");
    expect(value).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(value).not.toContain("signed-token");
    expect(value).not.toContain("sk-12345678901234567890");
    expect(value).not.toContain("AIza123456789012345678901234567890");
    expect(value).toContain("[authorization redacted]");
    expect(value).toContain("[cookie redacted]");
    expect(value).toContain("[token redacted]");
    expect(value).toContain("[secret redacted]");
  });

  it("redacts complete authorization and cookie header values idempotently", () => {
    const once = sanitizeOutboxErrorMessage(
      "Authorization: Basic opaque-basic-token\nProxy-Authorization: Digest opaque-proxy-token\nCookie: session=opaque-cookie; next=opaque-session\nSet-Cookie: refresh_token=opaque-refresh-cookie",
    );
    for (const secret of [
      "opaque-basic-token",
      "opaque-proxy-token",
      "opaque-cookie",
      "opaque-session",
      "opaque-refresh-cookie",
    ]) {
      expect(once).not.toContain(secret);
    }
    expect(once.match(/\[authorization redacted\]/g)).toHaveLength(2);
    expect(once.match(/\[cookie redacted\]/g)).toHaveLength(2);
    expect(sanitizeOutboxErrorMessage(once)).toBe(once);
  });

  it("is idempotent when a transport failure message is sanitized more than once", () => {
    const once = sanitizeOutboxErrorMessage(
      "request failed\nAuthorization: Bearer opaque-access-token\nsk-12345678901234567890\nAIza123456789012345678901234567890",
    );
    const twice = sanitizeOutboxErrorMessage(once);
    expect(twice).toBe(once);
    expect(twice).not.toContain("opaque-access-token");
    expect(twice).not.toContain("sk-12345678901234567890");
    expect(twice).not.toContain("AIza123456789012345678901234567890");
    expect(twice).toContain("[secret redacted]");
  });

  it("redacts OAuth codes, ID tokens, and client secrets in query and fragment URLs", () => {
    const value = sanitizeOutboxErrorMessage(
      "OAuth exchange failed: https://auth.example.test/callback?state=ok&code=opaque-auth-code#id_token=opaque-id-token&client_secret=opaque-client-secret",
    );
    for (const secret of ["opaque-auth-code", "opaque-id-token", "opaque-client-secret"]) {
      expect(value).not.toContain(secret);
    }
    expect(value).toContain("code=[redacted]");
    expect(value).toContain("id_token=[redacted]");
    expect(value).toContain("client_secret=[redacted]");
  });

  it("provides a bounded, non-empty fallback for unknown worker errors", () => {
    expect(sanitizeOutboxErrorMessage(null)).toBe("Unclassified worker error");
    expect(sanitizeOutboxErrorMessage(new Error("x".repeat(700)))).toHaveLength(500);
  });
});
