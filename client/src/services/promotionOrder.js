/** Single source for both drag-and-drop and keyboard-accessible position controls. */
export function movePromotion(ids, from, to) {
  if (!Array.isArray(ids) || !Number.isInteger(from) || !Number.isInteger(to) ||
      from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
  const copy=[...ids];
  const [picked]=copy.splice(from,1);
  copy.splice(to,0,picked);
  return copy;
}
