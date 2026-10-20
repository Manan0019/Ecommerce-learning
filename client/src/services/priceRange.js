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

// Display-friendly labels that cannot force a narrow 220px filter sidebar wider.
// The complete INR number remains available via title and ARIA on each label.
export function formatPriceCompact(value) {
  const number = Math.max(0, Number(value) || 0);
  const compact = (base, suffix) => {
    const units = number / base;
    return `₹${Number(units.toFixed(units < 10 ? 1 : 0)).toLocaleString("en-IN")}${suffix}`;
  };
  if (number >= 10000000) return compact(10000000, "Cr");
  if (number >= 100000) return compact(100000, "L");
  if (number >= 10000) return compact(1000, "k");
  return `₹${Math.round(number).toLocaleString("en-IN")}`;
}

export function pricePercent(value, bounds) {
  if (!bounds || bounds.max <= bounds.min) return 0;
  return Math.max(0, Math.min(100, ((value - bounds.min) / (bounds.max - bounds.min)) * 100));
}

// The hit area is wider than the usable rail. Insetting the rail by the thumb
// radius keeps both circular handles *entirely within* the sidebar at 0%/100%.
export function priceAtPointer(clientX, rect, bounds, thumbRadius = 18) {
  if (!rect || rect.width <= thumbRadius * 2 || !Number.isFinite(clientX)) return null;
  const fraction = Math.max(0, Math.min(1, (clientX - rect.left - thumbRadius) / (rect.width - thumbRadius * 2)));
  return bounds.min + fraction * (bounds.max - bounds.min);
}

export function priceSliderStep(bounds) {
  const span = Math.max(1, bounds.max - bounds.min);
  return Math.max(1, 10 ** Math.max(0, Math.floor(Math.log10(span)) - 2));
}

export function snapPriceValue(value, bounds, step) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return bounds.min;
  if (parsed <= bounds.min + step / 2) return bounds.min;
  if (parsed >= bounds.max - step / 2) return bounds.max;
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(parsed / step) * step));
}
