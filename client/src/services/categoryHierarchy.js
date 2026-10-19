/** Builds stable labels from IDs; handles nested categories, including missing parents. */
export function categoryPaths(categories) {
  const byId = new Map(categories.map(item => [String(item.id), item]));
  const pathFor = item => {
    const names = [], seen = new Set();
    let current = item;
    while (current && !seen.has(String(current.id))) {
      names.unshift(current.name);
      seen.add(String(current.id));
      current = current.parentId ? byId.get(String(current.parentId)) : null;
    }
    return names.join(" → ");
  };
  return categories.map(item => ({ ...item, path: pathFor(item) }));
}
export const rootCategories = categories => categories.filter(item => !item.parentId);
