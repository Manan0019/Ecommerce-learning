/**
 * Stock filter for the public catalogue.
 *
 * A product without SKUs has no `chosen` variant row. In variant mode we must
 * fall back to its parent/derived stock, or the In-stock checkbox hides all
 * standalone products. For a selected SKU we use that exact SKU stock.
 */
export function availabilityPredicate(view) {
  if (view === "variants") {
    return "COALESCE(chosen.stock, pricing.effective_stock) > 0";
  }
  if (view === "colors" || view === "products") {
    return "pricing.effective_stock > 0";
  }
  throw new Error(`Unsupported catalogue view: ${view}`);
}
