// Pure list manipulation; database writes use an advisory-lock transaction in featuredController.
export function orderFeaturedIds(currentIds, id, enabled, requestedPosition) {
  const key = String(id);
  const remaining = currentIds.map(String).filter(x => x !== key);
  if (!enabled) return remaining;
  const index = requestedPosition == null ? remaining.length : Math.max(0, Math.min(remaining.length, requestedPosition - 1));
  remaining.splice(index, 0, key);
  return remaining;
}
export function isExactFeaturedReorder(currentIds, nextIds) {
  if (!Array.isArray(nextIds) || nextIds.length !== currentIds.length) return false;
  if (nextIds.some(x => typeof x !== 'string' || !/^[1-9]\d*$/.test(x))) return false;
  return new Set(nextIds).size === nextIds.length && new Set(currentIds.map(String)).size === currentIds.length &&
    nextIds.every(x => currentIds.map(String).includes(x));
}
