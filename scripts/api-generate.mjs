/**
 * API type generation (frontend spec §7.2).
 *
 * Generates src/types/api.d.ts from the AUTHORITATIVE backend OpenAPI
 * document (../backend/generated/openapi.json) using openapi-typescript.
 * No hand-written endpoint types. Deterministic: same input → same output.
 *
 * The openapi-typescript CLI binary is resolved directly from node_modules
 * (no pnpm exec indirection) so the script is platform-independent and
 * CI-reliable.
 *
 * Usage:  pnpm api:generate   (pnpm api:check also verifies no drift)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.resolve(__dirname, "../../backend/generated/openapi.json");
const OUT = path.resolve(__dirname, "../src/types/api.d.ts");

if (!existsSync(SPEC)) {
  console.error(
    `Backend OpenAPI document not found at ${SPEC}. Run "pnpm openapi:export" in backend/ first (committed by Phase 9.5).`,
  );
  process.exit(1);
}

// Resolve the CLI binary from node_modules via its package.json (robust
// against "exports" maps that hide ./bin/ entries from require.resolve).
const pkgJsonPath = path.resolve(__dirname, "../node_modules/openapi-typescript/package.json");
if (!existsSync(pkgJsonPath)) {
  console.error("openapi-typescript is not installed (run pnpm install).");
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
const binRel = typeof pkg.bin === "string" ? pkg.bin : (pkg.bin["openapi-typescript"] ?? pkg.bin["openapi-typescript"]);
if (!binRel) {
  console.error("openapi-typescript package.json has no bin entry.");
  process.exit(1);
}
const cliBin = path.resolve(path.dirname(pkgJsonPath), binRel);
const result = spawnSync(process.execPath, [cliBin, SPEC, "-o", OUT], {
  stdio: "inherit",
});
if (result.status !== 0) {
  console.error("openapi-typescript failed");
  process.exit(result.status ?? 1);
}
console.log(`Generated ${OUT} from ${SPEC}`);
