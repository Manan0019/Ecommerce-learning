// Move several selected gallery items together, preserving their internal order.
export function moveSelectedMedia(items, selectedIds, targetId, placement = "before") {
  const chosen = new Set(selectedIds.map(String));
  const target = String(targetId);
  if (!chosen.size || (chosen.has(target) && placement === "before")) return [...items];
  const moved = items.filter(item => chosen.has(String(item.id)));
  if (!moved.length) return [...items];
  const rest = items.filter(item => !chosen.has(String(item.id)));
  const index = placement === "first" ? 0 : placement === "last" ? rest.length : rest.findIndex(item => String(item.id) === target);
  if (index < 0) return [...items];
  const result = [...rest];
  result.splice(index, 0, ...moved);
  return result;
}
