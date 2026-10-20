// Pure price-range rules shared by the storefront slider and its focused tests.
// A lower floor and upper ceiling keep fractional-price products inside the range.
export function normalizePriceBounds(priceBounds) {
  if (!priceBounds || priceBounds.min == null || priceBounds.max == null) return null;
  const minimum = Number(priceBounds.min);
  const maximum = Number(priceBounds.max);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum < minimum) {
    return null;
  }
  const min = Math.floor(minimum);
  const max = Math.max(min + 1, Math.ceil(maximum));
  return { min, max };
}

function clampPrice(value, lower, upper) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(lower, Math.min(upper, Math.round(parsed))) : lower;
}

export function getSelectedPriceRange(params, bounds) {
  const rawMin = params.get("minPrice");
  const rawMax = params.get("maxPrice");
  let min = rawMin === null ? bounds.min : clampPrice(rawMin, bounds.min, bounds.max);
  let max = rawMax === null ? bounds.max : clampPrice(rawMax, bounds.min, bounds.max);
  if (min > max) {
    // This can happen when users visit an older URL after the catalogue changes.
    min = max;
  }
  return { min, max };
}

export function movePriceHandle(kind, next, selected, bounds) {
  const proposed = clampPrice(next, bounds.min, bounds.max);
  if (kind === "min") return { ...selected, min: Math.min(proposed, selected.max) };
  if (kind === "max") return { ...selected, max: Math.max(proposed, selected.min) };
  return selected;
}

export function priceQueryValues(selected, bounds) {
  return {
    min: selected.min > bounds.min ? String(selected.min) : "",
    max: selected.max < bounds.max ? String(selected.max) : "",
  };
}
