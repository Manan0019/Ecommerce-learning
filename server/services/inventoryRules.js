/** Return the alert state for an active, purchasable stock entry. */
export function inventoryAlertStatus(stock, threshold, active = true) {
  if (!active || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(threshold) || threshold < 0) return null;
  if (stock === 0) return 'out';
  if (stock <= threshold) return 'low';
  return null;
}
