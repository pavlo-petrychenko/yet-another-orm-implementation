import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";

export async function fileChecksum(absolutePath: string): Promise<string> {
  const bytes = await fs.readFile(absolutePath);
  return createHash("sha256").update(bytes).digest("hex");
}
