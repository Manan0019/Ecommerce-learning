// UI-only price helpers: currency calculations in integer paise, percent in basis points.
export function parsePaise(value) {
 const str=String(value??"");
 if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(str)) return null;
 const [whole,decimal=""]=str.split(".");
 const n=Number(whole)*100+Number(decimal.padEnd(2,"0"));
 return Number.isSafeInteger(n)?n:null;
}
export function formatPaise(paise) { return (paise/100).toFixed(2); }
export function priceFromDiscount(mrp, percent) {
 const paise=parsePaise(mrp);
 if(paise===null || !/^(?:\d{1,2}|100)(?:\.\d{1,2})?$/.test(String(percent))) return null;
 const basis=Math.round(Number(percent)*100);
 if(basis<0||basis>10000)return null;
 return formatPaise(Math.round(paise*(10000-basis)/10000));
}
export function discountFromPrices(mrp, price) {
 const a=parsePaise(mrp),b=parsePaise(price);
 if(a===null||a===0||b===null||b>a)return "";
 return ((a-b)*100/a).toFixed(2);
}
export function updatePricingDraft(row,field,value) {
 const next={...row,[field]:value};
 if(field==="discount") {
   next.pricingMode="discount";
   const price=priceFromDiscount(next.mrp,value);
   if(price!==null)next.price=price;
 } else if(field==="price") {
   next.pricingMode="price";
   next.discount=discountFromPrices(next.mrp,next.price);
 } else if(field==="mrp") {
   if(next.pricingMode==="discount") {
     const price=priceFromDiscount(next.mrp,next.discount);
     if(price!==null)next.price=price;
   } else next.discount=discountFromPrices(next.mrp,next.price);
 }
 return next;
}
