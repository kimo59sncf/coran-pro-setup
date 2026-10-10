// Fails if the embedded mobile build references a local/dev URL or a server secret.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const dir = "dist-mobile";
const bad = [/localhost:\d+/, /127\.0\.0\.1/, /0\.0\.0\.0/, /id-preview--/, /sb_secret_/, /service_role/i, /LOVABLE_API_KEY/];
let found = 0, origin = false;
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|html|css|json)$/.test(f)) {
  const s = readFileSync(p, "utf8"); if (s.includes("https://coran-pro-setup.lovable.app")) origin = true;
  for (const r of bad) if (r.test(s)) { console.error(`✗ ${p}: ${r}`); found++; } } } };
walk(dir);
if (!origin) { console.error("✗ VITE_PUBLIC_API_ORIGIN not embedded"); found++; }
if (found) process.exit(1); console.log("✓ mobile build: no local/dev URLs, no secrets, production API origin embedded");
