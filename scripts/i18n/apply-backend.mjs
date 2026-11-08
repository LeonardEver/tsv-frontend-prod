/** Apply prepared source edits to the sibling backend, never a database. */
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const backend = await realpath(path.resolve("../backend"));
const manifest = JSON.parse(await readFile(process.argv[2] ?? "tmp/i18n-backend/manifest.json", "utf8"));
const sha = (text) => createHash("sha256").update(text).digest("hex");
for (const entry of manifest) {
  const destination = path.resolve(backend, entry.path);
  if (!destination.startsWith(backend + path.sep) || !/^(src|migrations|tests|scripts|docs)[/\\]/.test(entry.path)) throw new Error("Backend source path rejected");
  let before = null;
  try { before = await readFile(destination, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const next = await readFile(entry.staged, "utf8");
  if (before !== null && sha(before) === sha(next)) continue;
  if ((before === null ? null : sha(before)) !== entry.sourceHash) throw new Error("Source changed since preparation: " + entry.path);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, next);
  console.log(entry.path);
}
