// Small, pure helpers for the editable price fields on the catalogue slider.
// The slider and manual values intentionally share the same INR-unit bounds.
export function digitsOnlyPrice(value) {
  return String(value ?? "").replace(/[^0-9]/g, "").slice(0, 12);
}

export function validatePriceDraft(draft, bounds) {
  const errors = {};
  const minText = String(draft.min ?? "");
  const maxText = String(draft.max ?? "");
  if (!/^\d+$/.test(minText)) errors.min = "Enter a minimum price.";
  if (!/^\d+$/.test(maxText)) errors.max = "Enter a maximum price.";
  const min = Number(minText);
  const max = Number(maxText);
  if (!errors.min && (!Number.isSafeInteger(min) || min < bounds.min || min > bounds.max)) {
    errors.min = `Use ₹${bounds.min.toLocaleString("en-IN")}–₹${bounds.max.toLocaleString("en-IN")}.`;
  }
  if (!errors.max && (!Number.isSafeInteger(max) || max < bounds.min || max > bounds.max)) {
    errors.max = `Use ₹${bounds.min.toLocaleString("en-IN")}–₹${bounds.max.toLocaleString("en-IN")}.`;
  }
  if (!errors.min && !errors.max && min > max) {
    errors.max = "Maximum must be at least the minimum.";
  }
  return { valid: Object.keys(errors).length === 0, errors, min, max };
}
