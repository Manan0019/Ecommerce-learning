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

// Phase 30: miniature sidebars must not clip the slider thumbs, and keyboard
// movement / snapping must match pointer movement.
import {
  formatPriceCompact,
  priceAtPointer,
  pricePercent,
  priceSliderStep,
  snapPriceValue,
} from "../src/services/priceRange.js";

test("narrow sidebar maps both inset thumb centers to true catalogue endpoints", () => {
  const bounds = { min: 499, max: 29999 };
  const rect = { left: 10, width: 176 };
  assert.equal(priceAtPointer(10, rect, bounds), bounds.min);
  assert.equal(priceAtPointer(28, rect, bounds), bounds.min);
  assert.equal(priceAtPointer(168, rect, bounds), bounds.max);
  assert.equal(priceAtPointer(999, rect, bounds), bounds.max);
  assert.equal(priceAtPointer(98, rect, bounds), (bounds.min + bounds.max) / 2);
  assert.equal(priceAtPointer(20, { left: 10, width: 35 }, bounds), null);
});
test("thumb percentages and snapping have stable bounds", () => {
  const bounds = { min: 150, max: 20150 };
  assert.equal(pricePercent(150, bounds), 0);
  assert.equal(pricePercent(20150, bounds), 100);
  assert.equal(pricePercent(999999, bounds), 100);
  const step = priceSliderStep(bounds);
  assert.ok(step > 0);
  assert.equal(snapPriceValue(149, bounds, step), 150);
  assert.equal(snapPriceValue(999999, bounds, step), 20150);
});
test("compact INR labels stay short enough for mobile price pills", () => {
  assert.equal(formatPriceCompact(499), "₹499");
  assert.equal(formatPriceCompact(25000), "₹25k");
  assert.equal(formatPriceCompact(150000), "₹1.5L");
  assert.equal(formatPriceCompact(12500000), "₹1.3Cr");
});
