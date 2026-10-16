export type BoundedRequestBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" | "read_failed" | "invalid_utf8" };

/**
 * Read untrusted request bytes with a real memory bound; enforce actual bytes before decoding.
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
    if (!/^\d+$/.test(contentLength)) return { ok: false, reason: "read_failed" };
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
      // Empty chunks carry no payload; do not let them grow the chunk list without bound.
      if (value.byteLength > 0) chunks.push(value);
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

