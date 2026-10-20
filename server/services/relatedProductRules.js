// These are intentionally pure: database queries determine eligibility, while
// these rules establish a stable, explainable order without user tracking.
const positiveStock = (value) => Number(value) > 0;
const validDistance = (value) => value !== null && value !== undefined &&
  Number.isInteger(Number(value)) && Number(value) >= 0;

export function relatedGroup(row) {
  if (validDistance(row.categoryDistance)) {
    const distance = Number(row.categoryDistance);
    if (distance === 0) return 0; // exact category
    if (distance <= 2) return 1; // nearby category in the same branch
    return 2; // more distant shared ancestor
  }
  return row.brandMatch ? 3 : 4;
}

export function rankRelatedCandidates(candidates = [], sourceId, limit = 8) {
  const seen = new Set([String(sourceId)]);
  const unique = [];
  for (const item of candidates) {
    const id = String(item?.id ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(item);
  }
  return unique.sort((a, b) => {
    const group = relatedGroup(a) - relatedGroup(b);
    if (group) return group;
    const stock = Number(positiveStock(b.stock)) - Number(positiveStock(a.stock));
    if (stock) return stock;
    const distance = (validDistance(a.categoryDistance) ? Number(a.categoryDistance) : 99)
      - (validDistance(b.categoryDistance) ? Number(b.categoryDistance) : 99);
    if (distance) return distance;
    const brand = Number(Boolean(b.brandMatch)) - Number(Boolean(a.brandMatch));
    if (brand) return brand;
    const date = Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
    if (Number.isFinite(date) && date) return date;
    return Number(b.id) - Number(a.id);
  }).slice(0, Math.max(0, Math.min(Number(limit) || 8, 12)));
}

// Prefer the selected variant or its option's images to a parent cover,
// which can belong to a different colour. Shared images remain valid.
export function bestRelatedCover(card, media = []) {
  const selectedId = card.selectedVariantId == null ? null : String(card.selectedVariantId);
  const attributes = Object.fromEntries(Object.entries(card.selectedAttributes || {}).map(
    ([key, value]) => [key.toLowerCase(), String(value).toLowerCase()]));
  const candidates = media.filter((item) => {
    if (item.media_type !== 'image' || !item.media_url) return false;
    if (item.variant_id != null) return selectedId != null && String(item.variant_id) === selectedId;
    if (item.option_key != null) {
      const key = String(item.option_key).toLowerCase();
      const expected = attributes[key] ?? (key === 'colour' ? attributes.color : key === 'color' ? attributes.colour : undefined);
      return expected !== undefined && expected === String(item.option_value).toLowerCase();
    }
    return true;
  }).sort((a, b) => {
    const scope = item => item.variant_id != null ? 0 : item.option_key != null ? 1 : 2;
    return scope(a) - scope(b)
      || Number(b.is_card_cover === true) - Number(a.is_card_cover === true)
      || Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id);
  });
  return candidates[0]?.media_url || card.imageUrl || null;
}
