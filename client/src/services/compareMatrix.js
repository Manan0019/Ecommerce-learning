export function buildSpecificationComparison(products){
 const entries = new Map();
 for(const product of products){
  for(const group of product?.specificationDisplay?.groups||[]){
   for(const item of group.items||[]){
    const id=`${group.label}:${item.key||item.label}`;
    if(!entries.has(id))entries.set(id,{id,label:item.label,group:group.label,values:{}});
    entries.get(id).values[String(product.id)] = item.value;
   }
  }
 }
 return [...entries.values()];
}
