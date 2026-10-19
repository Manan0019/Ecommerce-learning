/**
 * One admin product may appear as several public catalogue tiles, one per Color/Colour.
 * RAM and Storage remain selectors on the shared product detail page. A simple product,
 * or a variable product without a Color dimension, has one tile.
 * This module is deliberately pure, so database results can be regression-tested.
 */
const colorKey = attributes => Object.keys(attributes || {}).find(k => /^(color|colour)$/i.test(k));
const normalize = value => String(value ?? "").trim().toLocaleLowerCase("en");
const order = (a, b) => Number(a.sort_order) - Number(b.sort_order) || Number(a.id) - Number(b.id);
const sellable = variant => Number(variant.stock) > 0;
const cheapest = (a, b) => Number(sellable(b)) - Number(sellable(a)) || Number(a.price) - Number(b.price) || Number(a.id) - Number(b.id);

export function makeStorefrontCards(products, variants = [], media = []) {
  const variantsByProduct = new Map();
  const mediaByProduct = new Map();
  for (const variant of variants) {
    const key = String(variant.product_id);
    if (!variantsByProduct.has(key)) variantsByProduct.set(key, []);
    variantsByProduct.get(key).push(variant);
  }
  for (const item of media) {
    const key = String(item.product_id);
    if (!mediaByProduct.has(key)) mediaByProduct.set(key, []);
    mediaByProduct.get(key).push(item);
  }
  return products.flatMap(product => {
    const entries = (variantsByProduct.get(String(product.id)) || []).filter(v => v.is_active);
    const colors = new Map();
    for (const variant of entries) {
      const key = colorKey(variant.attributes);
      if (!key) continue;
      const value = variant.attributes[key];
      const groupKey = normalize(value);
      if (groupKey && !colors.has(groupKey)) colors.set(groupKey, { value, items: [], key });
      if (groupKey) colors.get(groupKey).items.push(variant);
    }
    if (!colors.size) return [{ ...product, cardKey: `${product.id}:base` }];
    return [...colors.values()].map(group => {
      const representative = [...group.items].sort(cheapest)[0];
      const available = group.items.reduce((total, v) => total + (v.stock > 0 ? Number(v.stock) : 0), 0);
      const images = (mediaByProduct.get(String(product.id)) || []).filter(m => m.media_type === 'image');
      const optionImages = images.filter(m => m.option_key && /^(color|colour)$/i.test(m.option_key) && normalize(m.option_value) === normalize(group.value));
      const variantImages = images.filter(m => String(m.variant_id) === String(representative.id));
      const preferCover = arr => [...arr].sort((a, b) => Number(Boolean(b.is_card_cover)) - Number(Boolean(a.is_card_cover)) || order(a, b))[0];
      // Exact SKU-specific explicit cover wins, then option cover, then option image.
      // Other SKU images are never borrowed for another color.
      const cardImage = variantImages.find(m => m.is_card_cover) || optionImages.find(m => m.is_card_cover) || preferCover(optionImages) || preferCover(variantImages);
      return {
        ...product,
        cardKey: `${product.id}:color:${normalize(group.value)}`,
        parentProductId: String(product.id),
        selectedVariantId: String(representative.id),
        colorLabel: String(group.value),
        name: `${product.name} · ${group.value}`,
        imageUrl: cardImage?.media_url || product.imageUrl,
        price: representative.price,
        mrp: representative.mrp ?? representative.price,
        stock: available
      };
    });
  });
}
