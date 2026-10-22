// Product media selection for immutable order snapshots and legacy order previews.
// Never borrow a colour/SKU-specific photograph from another selected variant.
const normalized = value => String(value ?? '').trim().toLocaleLowerCase('en');
const colorOf = attributes => {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return '';
  const found = Object.entries(attributes).find(([key]) => /^(color|colour)$/i.test(key));
  return normalized(found?.[1]);
};
export function selectOrderImage(line, images, fallback = null, { exactVariant = false } = {}) {
  const chosenId = line.variantId == null ? '' : String(line.variantId);
  const color = colorOf(line.attributes);
  const candidates = images.filter(media =>
    String(media.product_id) === String(line.productId) &&
    typeof media.media_url === 'string' && Boolean(media.media_url.trim())
  );
  function rank(media) {
    if (chosenId && media.variant_id != null && String(media.variant_id) === chosenId) return 0;
    if (media.option_key && /^(color|colour)$/i.test(media.option_key) && color && normalized(media.option_value) === color) return 1;
    if (media.variant_id == null && media.option_key == null) return 2;
    return 100; // Another colour or variant must never represent this order line.
  }
  const selected = candidates.filter(media => rank(media) < (exactVariant ? 2 : 100)).sort((a,b) =>
    rank(a) - rank(b) || Number(Boolean(b.is_card_cover)) - Number(Boolean(a.is_card_cover)) ||
    Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0)
  )[0];
  return selected?.media_url || (exactVariant ? null : (typeof fallback === 'string' && fallback.trim() ? fallback : null));
}
export async function attachOrderImages(db, lines, { preserveSnapshots = false } = {}) {
  if (!lines.length) return lines;
  // Check all lines: historical order snapshots may contain only the parent cover.
  // The response may replace that generic URL when the exact SKU media exists.
  const pending = preserveSnapshots ? lines.filter(line => !line.imageUrl?.trim() || line.variantId || colorOf(line.attributes)) : lines;
  if (!pending.length) return lines;
  const ids = [...new Set(pending.map(line => String(line.productId)))];
  const [mediaResult, productResult] = await Promise.all([
    db.query(`SELECT id, product_id, variant_id, option_key, option_value, media_url, sort_order, is_card_cover
      FROM product_media WHERE product_id = ANY($1::bigint[]) AND media_type = 'image'`,[ids]),
    db.query('SELECT id,image_url FROM products WHERE id=ANY($1::bigint[])',[ids]),
  ]);
  const fallbackById = new Map(productResult.rows.map(p => [String(p.id), p.image_url]));
  return lines.map(line => {
    const generic=fallbackById.get(String(line.productId)) || null;
    const hasVariant=Boolean(line.variantId || colorOf(line.attributes));
    const exact=selectOrderImage(line,mediaResult.rows,null,{exactVariant:hasVariant});
    // Never replace a distinct historical SKU photo, even when today's gallery changes.
    if (preserveSnapshots && line.imageUrl?.trim() && line.imageUrl!==generic) return line;
    if(exact) return {...line,imageUrl:exact};
    if(hasVariant) return {...line,imageUrl:null}; // Wrong colour is worse than a placeholder.
    if(preserveSnapshots && line.imageUrl?.trim()) return line;
    return {...line,imageUrl:selectOrderImage(line,mediaResult.rows,generic||line.imageUrl)};
  });
}
