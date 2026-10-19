import { parsePaise } from "./variantPricing";
import { canonicalAttributes } from "./variantGenerator";
export function validateVariantDrafts(rows) {
 const skus=new Set(),combinations=new Set();
 return rows.map((row,index)=>{
  const sku=String(row.sku??"").trim();
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/.test(sku))throw Error(`Variant ${index+1}: Invalid SKU.`);
  if(skus.has(sku.toLowerCase()))throw Error(`Duplicate SKU: ${sku}`);
  skus.add(sku.toLowerCase());
  const attributes={};
  for(const line of String(row.attributesText??"").split("\n")){
   if(!line.trim())continue;
   const colon=line.indexOf(":");if(colon<1)throw Error(`${sku}: use Option: Value.`);
   const key=line.slice(0,colon).trim().toLowerCase().replace(/\s+/g,"_");
   const value=line.slice(colon+1).trim();
   if(!/^[a-z][a-z0-9_]{0,39}$/.test(key)||!value||value.length>80||key in attributes)throw Error(`${sku}: duplicate/invalid option value.`);
   attributes[key]=value;
  }
  if(Object.keys(attributes).length>10)throw Error(`${sku}: at most 10 option groups.`);
  const canonical=canonicalAttributes(attributes);
  if(combinations.has(canonical))throw Error(`${sku}: duplicate combination.`);
  combinations.add(canonical);
  const price=String(row.price??"");const mrp=String(row.mrp??row.price??"");
  if(parsePaise(price)===null||parsePaise(price)<=0||parsePaise(mrp)===null||parsePaise(mrp)<parsePaise(price))throw Error(`${sku}: MRP must be at least the positive selling price.`);
  if(!/^(?:0|[1-9]\d*)$/.test(String(row.stock))||Number(row.stock)>2147483647)throw Error(`${sku}: invalid stock.`);
  if (!/^(?:0|[1-9]\d*)$/.test(String(row.lowStockThreshold ?? 5)) || Number(row.lowStockThreshold ?? 5) > 1000000) throw Error(`${sku}: low-stock threshold must be a whole number from 0 to 1,000,000.`);
  if (String(row.customTitle || "").length > 260) throw Error(`${sku}: title is too long.`);
  return {...row,sku,attributes,mrp,price,customTitle:String(row.customTitle||"").trim()};
 });
}
