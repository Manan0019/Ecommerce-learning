// Return a bounded image list per public card without exposing media from another
// selected SKU or option value. The public card cover remains the first image.
const identity = value => String(value ?? "").trim().toLocaleLowerCase("en");
const sorted = (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0);

export function attachCardPreviews(cards = [], media = []) {
  const byProduct = new Map();
  for (const item of media) {
    if (item.media_type !== "image" || !item.media_url) continue;
    const key = String(item.product_id);
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(item);
  }
  return cards.map(card => {
    const productId = String(card.parentProductId || card.id);
    const variantId = card.selectedVariantId == null ? null : String(card.selectedVariantId);
    const attributes = Object.fromEntries(Object.entries(card.selectedAttributes || {}).map(([key,value]) => [identity(key), identity(value)]));
    if (card.colorLabel) { attributes.color = identity(card.colorLabel); attributes.colour = identity(card.colorLabel); }
    const visible = (byProduct.get(productId) || []).filter(item => {
      if (item.variant_id != null) return variantId != null && String(item.variant_id) === variantId;
      if (item.option_key != null) return attributes[identity(item.option_key)] === identity(item.option_value);
      return true;
    }).sort(sorted);
    const urls = [];
    for (const url of [card.imageUrl, ...visible.map(item => item.media_url)]) {
      if (typeof url === "string" && url.trim() && !urls.includes(url)) urls.push(url);
      if (urls.length >= 6) break;
    }
    return { ...card, previewImages: urls };
  });
}
