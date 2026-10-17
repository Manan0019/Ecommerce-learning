import test from "node:test";
import assert from "node:assert/strict";
import { validateCartItems, toPaise, fromPaise, summarizeCart } from "../services/cartPricing.js";

test("rejects duplicate SKU entries and invalid quantities", () => {
  assert.match(validateCartItems([{ productId: "1", variantId: "2", quantity: 1 }, { productId: "1", variantId: "2", quantity: 2 }]), /Duplicate/);
  assert.match(validateCartItems([{ productId: "1", quantity: 0 }]), /Invalid/);
  assert.equal(validateCartItems([{ productId: "1", variantId: "2", quantity: 1 }, { productId: "1", variantId: "3", quantity: 1 }]), null);
});
test("integer paise preserves exact decimals", () => {
  assert.equal(toPaise("19.99"), 1999n);
  assert.equal(fromPaise(1999n * 3n), "59.97");
  assert.throws(() => toPaise("19.999"));
});
test("unavailable items remain visible but excluded from available subtotal", () => {
  assert.deepEqual(summarizeCart([
    { available: true, lineTotal: "100.50" },
    { available: false, lineTotal: "25.25" },
    { available: false },
  ]), { subtotal: "125.75", availableSubtotal: "100.50", unavailableCount: 2, valid: false });
});
