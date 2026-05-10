import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { fileChecksum } from "@/migrations/checksum";

describe("fileChecksum", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "yaoi-checksum-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("produces deterministic SHA-256 hex for known content", async () => {
    const file = path.join(tmpDir, "a.ts");
    await fs.writeFile(file, "hello world");
    const sum = await fileChecksum(file);
    expect(sum).toBe(
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
  });

  it("differs when bytes differ by a single character", async () => {
    const a = path.join(tmpDir, "a.ts");
    const b = path.join(tmpDir, "b.ts");
    await fs.writeFile(a, "hello");
    await fs.writeFile(b, "hellp");
    const sumA = await fileChecksum(a);
    const sumB = await fileChecksum(b);
    expect(sumA).not.toBe(sumB);
  });

  it("re-reads file content (not cached) — mutation changes the checksum", async () => {
    const file = path.join(tmpDir, "a.ts");
    await fs.writeFile(file, "v1");
    const before = await fileChecksum(file);
    await fs.writeFile(file, "v2");
    const after = await fileChecksum(file);
    expect(before).not.toBe(after);
  });
});
