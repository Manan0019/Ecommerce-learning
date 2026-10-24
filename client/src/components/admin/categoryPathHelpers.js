export function categoryTrail(categories, id) {
  const byId=new Map(categories.map(c=>[String(c.id),c]));
  const seen=new Set(); const trail=[];let current=byId.get(String(id));
  while(current&&!seen.has(String(current.id))){trail.unshift(current);seen.add(String(current.id));current=byId.get(String(current.parentId));}
  return trail;
}
export function categoryDepth(categories,id){return categoryTrail(categories,id).length;}

