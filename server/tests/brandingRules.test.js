import test from "node:test";
import assert from "node:assert/strict";
import { acceptableSymbolDimensions, resolveFaviconUrl } from "../services/brandingRules.js";

test("symbol accepts reasonable aspect ratio and dimensions", () => {
  assert.equal(acceptableSymbolDimensions(256, 256), true);
  assert.equal(acceptableSymbolDimensions(512, 384), true);
  assert.equal(acceptableSymbolDimensions(600, 100), false); // rejects name-bearing wide logo
  assert.equal(acceptableSymbolDimensions(20, 20), false);
  assert.equal(acceptableSymbolDimensions(8000, 4000), false);
});
test("separate favicon wins, else follows icon, then fallback", () => {
  assert.equal(resolveFaviconUrl("/icon.webp", null), "/icon.webp");
  assert.equal(resolveFaviconUrl("/icon.webp", "/favicon.png"), "/favicon.png");
  assert.equal(resolveFaviconUrl(null, null), null);
});
