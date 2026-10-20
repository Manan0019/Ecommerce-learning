import assert from "node:assert/strict";
import test from "node:test";
import {
  getSelectedPriceRange,
  movePriceHandle,
  normalizePriceBounds,
  priceQueryValues,
} from "../src/services/priceRange.js";

test("uses actual price bounds with conservative whole-rupee rounding", () => {
  assert.deepEqual(normalizePriceBounds({ min: "499.99", max: "3500.01" }), { min: 499, max: 3501 });
});
test("does not render an invented slider for an empty category", () => {
  assert.equal(normalizePriceBounds(null), null);
  assert.equal(normalizePriceBounds({ min: null, max: null }), null);
  assert.equal(normalizePriceBounds({ min: 100, max: 50 }), null);
});
test("single-price catalogues still provide an operable control", () => {
  assert.deepEqual(normalizePriceBounds({ min: 999, max: 999 }), { min: 999, max: 1000 });
});
test("reads previously applied URL values", () => {
  const range = { min: 200, max: 5000 };
  const selected = getSelectedPriceRange(new URLSearchParams("minPrice=600&maxPrice=1200"), range);
  assert.deepEqual(selected, { min: 600, max: 1200 });
});
test("keeps endpoints within the catalogue and never inverts handles", () => {
  const bounds = { min: 200, max: 5000 };
  let selection = { min: 500, max: 3000 };
  selection = movePriceHandle("min", 4000, selection, bounds);
  assert.equal(selection.min, 3000);
  selection = movePriceHandle("max", 1000, selection, bounds);
  assert.equal(selection.max, 3000);
  selection = movePriceHandle("max", 999999, selection, bounds);
  assert.equal(selection.max, 5000);
});
test("does not send redundant bounds; can clear previously applied filters", () => {
  const bounds = { min: 200, max: 5000 };
  assert.deepEqual(priceQueryValues({ min: 200, max: 5000 }, bounds), { min: "", max: "" });
  assert.deepEqual(priceQueryValues({ min: 600, max: 1200 }, bounds), { min: "600", max: "1200" });
});
test("stale URL values clamp to updated category bounds", () => {
  const bounds = { min: 400, max: 900 };
  assert.deepEqual(getSelectedPriceRange(new URLSearchParams("minPrice=50&maxPrice=9999"), bounds), bounds);
});
