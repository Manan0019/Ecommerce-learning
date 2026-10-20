import test from "node:test";
import assert from "node:assert/strict";
import { digitsOnlyPrice, validatePriceDraft } from "../src/services/priceInput.js";
import { getSelectedPriceRange, priceQueryValues, normalizePriceBounds } from "../src/services/priceRange.js";
const bounds = { min: 298, max: 190000 };

test("typed prices accept pasted currency text but never accept letters or negatives", () => {
  assert.equal(digitsOnlyPrice("₹ 85,999"), "85999");
  assert.equal(digitsOnlyPrice("-1e3"), "13");
  assert.equal(digitsOnlyPrice(""), "");
  assert.equal(digitsOnlyPrice("1".repeat(15)).length, 12);
});
test("typed range is valid with matching endpoints or exact intermediate rupees", () => {
  assert.deepEqual(validatePriceDraft({ min: "1000", max: "1000" }, bounds), { valid:true,errors:{},min:1000,max:1000 });
  assert.equal(validatePriceDraft({ min: "999", max: "140001" }, bounds).valid, true);
});
test("empty, out-of-range and inverted typed values are rejected before Apply", () => {
  for (const draft of [{ min: "", max: "500" }, { min: "1", max: "500" }, { min: "400", max: "999999" }, { min: "1500", max: "700" }]) {
    assert.equal(validatePriceDraft(draft, bounds).valid, false);
  }
});
test("typed range uses existing URL query serialization and survives reload", () => {
  const selected = validatePriceDraft({ min: "1200", max: "89999" }, bounds);
  assert.equal(selected.valid, true);
  const query = priceQueryValues(selected, bounds);
  const url = new URLSearchParams({ minPrice: query.min, maxPrice: query.max });
  assert.deepEqual(getSelectedPriceRange(url,bounds),{ min: 1200,max:89999 });
  assert.deepEqual(priceQueryValues(bounds,bounds),{min:"",max:""});
});
test("bounds still normalize and clamp legacy URLs", () => {
  assert.deepEqual(normalizePriceBounds({min:298.3,max:1999.99}),{min:298,max:2000});
  assert.deepEqual(getSelectedPriceRange(new URLSearchParams("minPrice=-1000&maxPrice=500000"),bounds),bounds);
});
