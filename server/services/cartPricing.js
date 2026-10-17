export function isPositiveId(value) {
  return typeof value === "string" && /^[1-9]\d*$/.test(value);
}

export function validateCartItems(items) {
  if (!Array.isArray(items) || items.length > 50) return "Invalid cart size.";
  const seen = new Set();
  for (const item of items) {
    if (!item || !isPositiveId(item.productId) ||
      (item.variantId != null && !isPositiveId(item.variantId)) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return "Invalid cart item.";
    }
    const key = `${item.productId}:${item.variantId ?? ""}`;
    if (seen.has(key)) return "Duplicate cart line.";
    seen.add(key);
  }
  return null;
}

export function toPaise(value) {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Invalid price");
  const str = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(str)) throw new Error("Invalid price");
  const [whole, decimals = ""] = str.split(".");
  return BigInt(whole) * 100n + BigInt(decimals.padEnd(2, "0"));
}

export function fromPaise(value) {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}

export function summarizeCart(lines) {
  let estimated = 0n;
  let available = 0n;
  let unavailableCount = 0;
  for (const line of lines) {
    if (!line.available) unavailableCount += 1;
    if (line.lineTotal == null) continue;
    const total = toPaise(line.lineTotal);
    estimated += total;
    if (line.available) available += total;
  }
  return {
    subtotal: fromPaise(estimated),
    availableSubtotal: fromPaise(available),
    unavailableCount,
    valid: unavailableCount === 0,
  };
}
