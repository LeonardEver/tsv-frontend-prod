import { readFile } from "node:fs/promises";
const ns = process.argv[2] ?? "admin";
const source = JSON.parse(await readFile(`src/i18n/locales/en/${ns}.json`, "utf8"));
const target = JSON.parse(await readFile(`src/i18n/locales/es/${ns}.json`, "utf8"));
const missing = [...new Set(Object.entries(source).filter(([key]) => !(key in target)).map(([, text]) => text))];
console.log(`Missing unique ${ns} strings: ${missing.length}`);
console.log(missing.slice(Number(process.argv[3] ?? 0), Number(process.argv[4] ?? 100)).join("\n"));
