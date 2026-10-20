const normalize = value => String(value ?? "");

export function buildCategoryMenu(categories = []) {
  const active = categories.filter(category => category.isActive !== false);
  const nodes = new Map(active.map(category => [normalize(category.id), { ...category, children: [] }]));
  const roots = [];
  for (const category of active) {
    const node = nodes.get(normalize(category.id));
    const parent = nodes.get(normalize(category.parentId));
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const order = (list, visited = new Set()) => list.filter(node => !visited.has(normalize(node.id)))
    .map(node => {
      visited.add(normalize(node.id));
      return { ...node, children: order(node.children, visited) };
    }).sort((a,b) => a.name.localeCompare(b.name));
  return order(roots);
}

