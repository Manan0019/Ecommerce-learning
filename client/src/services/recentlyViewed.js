const KEY = "nexora_recently_viewed_v1";
export function readRecentlyViewed() {
  try { const values = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(values) ? values.filter(p => p && /^\d+$/.test(String(p.id)) && typeof p.name === "string").slice(0, 8) : [];
  } catch { return []; }
}
export function rememberProduct(product) {
  if (!product || !/^\d+$/.test(String(product.id))) return;
  try {
    const item = { id: String(product.id), name: String(product.name || "").slice(0, 180), imageUrl: String(product.imageUrl || "").slice(0, 500), category: String(product.category || "").slice(0, 90),
      brand: String(product.brand || "").slice(0, 100), model: String(product.model || "").slice(0, 100),
      price: Number(product.price || 0), stock: Number(product.stock || 0),
      hasVariants: Boolean(product.hasVariants),
      selectedVariantId: product.selectedVariantId ? String(product.selectedVariantId) : null };
    window.localStorage.setItem(KEY, JSON.stringify([item, ...readRecentlyViewed().filter(p => p.id !== item.id)].slice(0, 8)));
    window.dispatchEvent(new Event("nexora-recent-changed"));
  } catch { /* Blocked storage must not interrupt shopping. */ }
}
export function clearRecentlyViewed() {
  try { window.localStorage.removeItem(KEY); window.dispatchEvent(new Event("nexora-recent-changed")); } catch { /* optional feature */ }
}
