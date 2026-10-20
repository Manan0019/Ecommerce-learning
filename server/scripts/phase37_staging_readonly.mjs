/** Phase 37 read-only smoke: checks public endpoints and media paths, never posts or deletes. */
const base = (process.argv[2] || "http://localhost:4000").replace(/\/$/, "");
let failed = 0;
for (const [name, route] of [
  ["Public category tree", "/api/categories"],
  ["Home promotions", "/api/banners?position=home"],
  ["Featured products", "/api/products?featured=true&view=products&limit=4"],
  ["Public catalogue", "/api/products?view=products&limit=4"]
]) {
  try {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(8000) });
    const payload = await response.json();
    if (!response.ok || !payload || typeof payload !== "object") throw new Error(`HTTP ${response.status}`);
    console.log(`PASS  ${name}: HTTP ${response.status}`);
  } catch (error) { failed++; console.error(`FAIL  ${name}: ${error.message}`); }
}
if (failed) { console.error(`${failed} checks failed. Start Express and verify migrations first.`); process.exitCode = 1; }
else console.log("4/4 public read-only checks passed. Authenticated checkout and UI still require testing.");
