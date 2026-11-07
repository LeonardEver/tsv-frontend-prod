// Dev helper: print failing tests per file from a vitest json report.
const fs = require("fs");
const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/list-failures.cjs <report.json>");
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(path, "utf8"));
for (const f of report.testResults) {
  if (f.status !== "failed") continue;
  const name = f.name.replace(/\\/g, "/").split("/frontend/").pop() ?? f.name;
  const failures = f.assertionResults.filter((t) => t.status === "failed");
  console.log(`${name} (${failures.length} failed)`);
  for (const t of failures) console.log(`  - ${t.fullName}`);
}
