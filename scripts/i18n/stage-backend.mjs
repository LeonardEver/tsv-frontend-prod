/** Prepare a reviewable, hash-checked source manifest. Does not touch backend files. */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const base = process.argv[2] ?? "tmp/i18n-content-backend";
const files = [];
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await visit(file);
    else {
      const relative = path.relative(path.join(base, "files"), file).replaceAll("\\", "/");
      let sourceHash = null;
      try { sourceHash = createHash("sha256").update(await readFile(path.resolve("../backend", relative))).digest("hex"); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      files.push({ path: relative, staged: file, sourceHash });
    }
  }
}
await visit(path.join(base, "files"));
await writeFile(path.join(base, "manifest.json"), JSON.stringify(files, null, 2));
console.log(`${files.length} backend source files staged`);
