/** Visible items retain the *single saved gallery order*, irrespective of media scope.
 * That permits: Midnight, Midnight, Shared, Midnight, Shared, etc.
 */
export function visibleProductMedia(items = [], variantId = null, attributes = {}) {
  return items.filter(item => {
    if (item.variantId != null) return variantId != null && String(item.variantId) === String(variantId);
    if (item.optionKey != null) return String(attributes?.[item.optionKey] ?? '') === String(item.optionValue ?? '');
    return true;
  }).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0));
}
