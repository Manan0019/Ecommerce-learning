import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Prevent the Phase 30 price slider from inheriting the old 2-column
// `.price-filter > div` rule from app.css. That rule was the real layout bug.
const legacy = readFileSync(new URL("../src/styles/site.css", import.meta.url), "utf8");
const modern = readFileSync(new URL("../src/styles/site.css", import.meta.url), "utf8");

test("legacy 2-column price form rule remains known and guarded", () => {
  assert.match(legacy, /\.price-filter\s*>\s*div\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/s);
  assert.match(modern, /\.catalogue-filters\s+fieldset\.price-filter\s*>\s*div\.nx30-price-filter\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

test("each slider row stays a full-width grid item", () => {
  assert.match(modern, /fieldset\.price-filter\s*>\s*\.nx30-price-filter\s*>\s*\*\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
});

test("slider rail and controls use their own widths", () => {
  assert.match(modern, /\.catalogue-filters\s+\.nx30-price-hit-area\s*\{[^}]*width:\s*100%/s);
  assert.match(modern, /\.catalogue-filters\s+\.nx30-price-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/s);
});
