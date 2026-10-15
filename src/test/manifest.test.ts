import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

type WebManifest = {
  name: string;
  short_name: string;
  id: string;
  start_url: string;
  scope: string;
  display: string;
  lang: string;
  dir: string;
  icons: ManifestIcon[];
};

async function readManifest(): Promise<WebManifest> {
  const source = await readFile(resolve(process.cwd(), "public/manifest.webmanifest"), "utf8");
  return JSON.parse(source) as WebManifest;
}

describe("Aghbari installable web manifest", () => {
  it("keeps a stable Arabic identity and root navigation scope", async () => {
    const manifest = await readManifest();

    expect(manifest.name).toContain("Aghbari Commerce");
    expect(manifest.short_name).toBe("الأغبري");
    expect(manifest.id).toBe("/");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("ar");
    expect(manifest.dir).toBe("rtl");
  });

  it("ships valid PNG launcher icons at 192px and 512px, including a maskable icon", async () => {
    const manifest = await readManifest();
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    for (const size of [192, 512] as const) {
      const expectedDimensions = `${size}x${size}`;
      const icon = manifest.icons.find(
        (candidate) => candidate.type === "image/png" && candidate.sizes === expectedDimensions,
      );
      if (!icon) throw new Error(`Missing required ${expectedDimensions} PNG icon`);
      expect(icon.src).toMatch(/^\/[a-z0-9-]+\.png$/);

      const bytes = await readFile(resolve(process.cwd(), "public", icon.src.slice(1)));
      expect(bytes.subarray(0, 8)).toEqual(pngSignature);
      expect(bytes.readUInt32BE(16)).toBe(size);
      expect(bytes.readUInt32BE(20)).toBe(size);
      if (size === 512) {
        expect(icon.purpose?.split(/\s+/)).toContain("maskable");
        expect(icon.purpose?.split(/\s+/)).toContain("any");
      }
    }
  });
});
