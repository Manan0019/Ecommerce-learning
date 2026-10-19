import test from "node:test";
import assert from "node:assert/strict";
import { availabilityPredicate } from "../services/catalogueAvailability.js";

test("SKU catalogue stock filter checks selected variant and falls back for simple products", () => {
  assert.equal(availabilityPredicate("variants"), "COALESCE(chosen.stock, pricing.effective_stock) > 0");
});

test("grouped catalogue stock filters use effective parent stock", () => {
  assert.equal(availabilityPredicate("colors"), "pricing.effective_stock > 0");
  assert.equal(availabilityPredicate("products"), "pricing.effective_stock > 0");
});

test("unknown catalogue display modes fail closed", () => {
  assert.throws(() => availabilityPredicate("unknown"), /Unsupported catalogue view/);
});
