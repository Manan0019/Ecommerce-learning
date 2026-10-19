import { parsePaise } from "./variantPricing";

export const newOptionGroup = () => ({ id: crypto.randomUUID(), name:"", values:"" });
const normalizeName = (name) => {
 const result=String(name).trim().toLowerCase().replace(/\s+/g,"_");
 if(!/^[a-z][a-z0-9_]{0,39}$/.test(result)) throw Error("Option name must start with a letter (e.g. Color, RAM, Storage).");
 return result;
};
const skuToken=(value)=>String(value).trim().toUpperCase().replace(/[^A-Z0-9]+/g,"-").replace(/^-|-$/g,"");
export function canonicalAttributes(attributes){
 return JSON.stringify(Object.entries(attributes).sort(([a],[b])=>a.localeCompare(b)));
}
function parseGroup(group) {
 const name=normalizeName(group.name);
 const values=String(group.values).split(",").map(v=>v.trim()).filter(Boolean);
 if(!values.length || values.length>30 || values.some(v=>v.length>80)) throw Error(`${group.name}: enter 1–30 comma-separated values (max 80 characters each).`);
 if(new Set(values.map(v=>v.toLowerCase())).size!==values.length) throw Error(`${group.name}: repeated option value.`);
 return {name,values};
}
export function generateVariantMatrix({groups,skuPrefix,defaultMrp,defaultPrice,defaultStock,existing=[],limit=120}){
 if(!Array.isArray(groups)||!groups.length||groups.length>8)throw Error("Choose 1–8 option groups.");
 const normalized=groups.map(parseGroup);
 if(new Set(normalized.map(g=>g.name)).size!==normalized.length)throw Error("Option group names must be different.");
 const count=normalized.reduce((acc,g)=>acc*g.values.length,1);
 if(count+existing.length>limit)throw Error(`Maximum ${limit} SKU rows. Reduce option values or remove drafts.`);
 const prefix=skuToken(skuPrefix);
 if(!prefix||prefix.length>40)throw Error("Enter a valid SKU prefix up to 40 characters.");
 if(parsePaise(defaultMrp)===null||parsePaise(defaultPrice)===null||parsePaise(defaultPrice)<=0||parsePaise(defaultMrp)<parsePaise(defaultPrice))throw Error("Default MRP must be greater than or equal to a positive selling price.");
 if(!/^(?:0|[1-9]\d*)$/.test(String(defaultStock))||Number(defaultStock)>2147483647)throw Error("Invalid stock quantity.");
 const usedSKUs=new Set(existing.map(x=>x.sku?.trim().toLowerCase()).filter(Boolean));
 const usedOptions=new Set(existing.map(x=>x.attributes?canonicalAttributes(x.attributes):canonicalText(x.attributesText)).filter(Boolean));
 let combinations=[{}];
 for(const group of normalized){
   combinations=combinations.flatMap(base=>group.values.map(value=>({...base,[group.name]:value})));
 }
 const output=[];
 for(const attributes of combinations){
  const canon=canonicalAttributes(attributes);
  if(usedOptions.has(canon))continue;
  const sku=[prefix,...Object.values(attributes).map(skuToken)].join("-");
  if(!/^[A-Z0-9][A-Z0-9_-]{1,79}$/.test(sku))throw Error(`Generated SKU ${sku} is invalid or too long; shorten your prefix/values.`);
  if(usedSKUs.has(sku.toLowerCase()))throw Error(`SKU collision: ${sku}. Adjust prefix or values.`);
  usedSKUs.add(sku.toLowerCase());usedOptions.add(canon);
  output.push({key:crypto.randomUUID(),sku,attributesText:Object.entries(attributes).map(([k,v])=>`${k}: ${v}`).join("\n"),
    mrp:String(defaultMrp),price:String(defaultPrice),stock:String(defaultStock),lowStockThreshold:"5",
    discount:"",pricingMode:"price",isActive:true});
 }
 return output;
}
function canonicalText(text) {
 if(typeof text!=="string")return null;
 const attributes={};
 for(const line of text.split("\n")){if(!line.trim())continue;const at=line.indexOf(":");if(at<1)return null;attributes[line.slice(0,at).trim().toLowerCase().replace(/\s+/g,"_")]=line.slice(at+1).trim();}
 return Object.keys(attributes).length?canonicalAttributes(attributes):null;
}
// Backward-compatible API for callers using the old two-group generator.
export function buildVariantDrafts({nameA,valuesA,nameB,valuesB,skuPrefix,defaultPrice,defaultStock,existing=[],limit=30}){
 return generateVariantMatrix({groups:[{name:nameA,values:valuesA},...(String(valuesB||"").trim()?[{name:nameB,values:valuesB}]:[])],
   skuPrefix,defaultMrp:defaultPrice,defaultPrice,defaultStock,existing,limit});
}
