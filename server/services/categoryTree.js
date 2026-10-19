/** Public category counts include active descendants. No extra product rows are invented. */
export function withDescendantCounts(categories) {
  const byId = new Map(categories.map(c => [String(c.id), c]));
  const children = new Map();
  for (const row of categories) {
    const parent = row.parentId == null ? "" : String(row.parentId);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(row);
  }
  const count = (node, visiting = new Set()) => {
    const key = String(node.id);
    if(visiting.has(key)) return 0;
    const next = new Set(visiting); next.add(key);
    return Number(node.productCount || 0) + (children.get(key)||[]).reduce((n,child)=>n+count(child,next),0);
  };
  return categories.map(category => ({...category, productCount: count(category), directProductCount: Number(byId.get(String(category.id)).productCount || 0)}));
}
