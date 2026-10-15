import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WorkerEvent = { waitUntil: (promise: Promise<unknown>) => void };
type Listener = (event: WorkerEvent) => void;

async function loadServiceWorker(overrides: {
  cacheAdd?: (url: string) => Promise<void>;
  cacheNames?: string[];
  cacheMatch?: (request: Request) => Promise<Response | null>;
  fetcher?: (request: Request) => Promise<Response>;
} = {}) {
  const source = await readFile(resolve(process.cwd(), "public/sw.js"), "utf8");
  const listeners = new Map<string, Listener>();
  const cacheAdd = vi.fn(async (url: string) => overrides.cacheAdd?.(url));
  const cache = { add: cacheAdd };
  const cacheDelete = vi.fn(async () => true);
  const cacheNames = overrides.cacheNames ?? [];
  const cachesMock = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => cacheNames),
    delete: cacheDelete,
    match: vi.fn(async (request: Request) => overrides.cacheMatch?.(request) ?? null),
  };
  const skipWaiting = vi.fn(async () => undefined);
  const claim = vi.fn(async () => undefined);
  const selfMock = {
    addEventListener: (name: string, listener: Listener) => listeners.set(name, listener),
    skipWaiting,
    clients: { claim },
    location: { origin: "https://aghbari.example" },
  };

  runInNewContext(source, {
    self: selfMock,
    caches: cachesMock,
    URL,
    Promise,
    Response,
    fetch: vi.fn((request: Request) => overrides.fetcher
      ? overrides.fetcher(request)
      : Promise.reject(new Error("unexpected network request"))),
    console,
  });

  return { listeners, cacheAdd, cachesMock, cacheDelete, skipWaiting, claim };
}

describe("Aghbari PWA offline shell", () => {
  it("caches the available shell assets even when one optional asset fails", async () => {
    const worker = await loadServiceWorker({
      cacheAdd: async (url) => {
        if (url === "/manifest.webmanifest") throw new Error("manifest unavailable");
      },
    });
    const pending: Promise<unknown>[] = [];
    worker.listeners.get("install")?.({ waitUntil: (promise) => pending.push(promise) });

    await Promise.all(pending);

    expect(worker.cachesMock.open).toHaveBeenCalledWith("aghbari-shell-v2");
    expect(worker.cacheAdd.mock.calls.map(([url]) => url)).toEqual([
      "/", "/manifest.webmanifest", "/favicon.ico",
    ]);
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it("serves a cached asset without an unhandled rejection when the background refresh is offline", async () => {
    const cachedResponse = new Response("cached asset", { status: 200 });
    const worker = await loadServiceWorker({
      cacheMatch: async () => cachedResponse,
      fetcher: async () => { throw new Error("offline"); },
    });
    const pending: Promise<Response>[] = [];
    worker.listeners.get("fetch")?.({
      request: {
        method: "GET",
        url: "https://aghbari.example/assets/app.js",
        mode: "cors",
      } as Request,
      respondWith: (promise) => pending.push(promise as Promise<Response>),
    } as WorkerEvent & { request: Request; respondWith: (promise: Promise<Response>) => void });

    await expect(Promise.all(pending)).resolves.toEqual([cachedResponse]);
  });

  it("removes previous shell cache versions during activation", async () => {
    const worker = await loadServiceWorker({ cacheNames: ["aghbari-shell-v1", "aghbari-shell-v2", "unrelated-cache"] });
    const pending: Promise<unknown>[] = [];
    worker.listeners.get("activate")?.({ waitUntil: (promise) => pending.push(promise) });

    await Promise.all(pending);

    expect(worker.cacheDelete).toHaveBeenCalledTimes(1);
    expect(worker.cacheDelete).toHaveBeenCalledWith("aghbari-shell-v1");
    expect(worker.claim).toHaveBeenCalledOnce();
  });
});
