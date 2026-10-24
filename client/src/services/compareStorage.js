const KEY='nexora_comparisons_v1';
export function saveCompareProduct(product) {
  let previous=[];
  try{previous=JSON.parse(localStorage.getItem(KEY)||'[]');}catch{/* Recover invalid local data. */}
  const id=String(product.parentProductId||product.id);
  if(previous.includes(id))return 'Already in compare';
  if(previous.length>=4)return 'Compare up to four products.';
  localStorage.setItem(KEY,JSON.stringify([...previous,id]));
  window.dispatchEvent(new Event('nexora:compare-changed'));
  return 'Added to compare';
}
export function readCompareIds(){try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>/^\d+$/.test(String(x))).slice(0,4);}catch{return [];}}
