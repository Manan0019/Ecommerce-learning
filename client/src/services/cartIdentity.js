// Never share a persisted shopping cart across customer accounts.
// The original global ecommerce_cart_v1 key is deliberately not imported:
// its owner cannot be determined safely after a login switch.
export const cartStorageKey = user => {
  const id = user?.id;
  return user?.role === 'customer' && /^[1-9]\d*$/.test(String(id ?? ''))
    ? `nexora_cart_v2_customer_${id}`
    : user?.role === 'admin' || user?.role === 'delivery'
      ? 'nexora_cart_v2_staff_empty'
      : 'nexora_cart_v2_guest';
};

export function sanitizeCart(parsed) {
  if (!Array.isArray(parsed)) return [];
  const seen = new Set();
  return parsed.filter(item => {
    if (!item || typeof item.productId !== 'string' || !/^[1-9]\d*$/.test(item.productId) ||
      (item.variantId != null && (typeof item.variantId !== 'string' || !/^[1-9]\d*$/.test(item.variantId))) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
      seen.has(`${item.productId}:${item.variantId || ''}`)) return false;
    seen.add(`${item.productId}:${item.variantId || ''}`);
    return true;
  }).slice(0, 50);
}
