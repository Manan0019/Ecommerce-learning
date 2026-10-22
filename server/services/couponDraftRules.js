const money=v=>/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(String(v));
function safeIds(v){
 if(!Array.isArray(v)||v.length>100||new Set(v.map(String)).size!==v.length)return null;
 if(!v.every(id=>Number.isSafeInteger(Number(id))&&Number(id)>0&&Number(id)<=2147483647))return null;
 return v.map(Number);
}
export function validateCouponDraft(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const code=String(raw.code||'').trim().toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code))return null;
 const kind=raw.kind;
 if(!['percent','fixed'].includes(kind))return null;
 const v=String(raw.value),minimum=String(raw.minimumSubtotal??0),maxRedemptions=Number(raw.maxRedemptions??100);
 if(!money(v)||Number(v)<=0||(kind==='percent'&&Number(v)>50)||(kind==='fixed'&&Number(v)>100000))return null;
 if(!money(minimum)||!Number.isSafeInteger(maxRedemptions)||maxRedemptions<1||maxRedemptions>100000)return null;
 const startsAt=raw.startsAt?String(raw.startsAt):null,expiresAt=raw.expiresAt?String(raw.expiresAt):null;
 if((startsAt&&Number.isNaN(Date.parse(startsAt)))||(expiresAt&&Number.isNaN(Date.parse(expiresAt)))||(startsAt&&expiresAt&&Date.parse(expiresAt)<=Date.parse(startsAt)))return null;
 const scope=raw.scope||'order';
 if(!['order','products','categories'].includes(scope))return null;
 const productIds=safeIds(raw.productIds||[]),categoryIds=safeIds(raw.categoryIds||[]),excludedProductIds=safeIds(raw.excludedProductIds||[]);
 if(!productIds||!categoryIds||!excludedProductIds)return null;
 if(scope==='products'&&productIds.length===0||scope==='categories'&&categoryIds.length===0)return null;
 if(scope!=='products'&&productIds.length||scope!=='categories'&&categoryIds.length)return null;
 if(productIds.some(id=>excludedProductIds.includes(id)))return null;
 const minQualifying=String(raw.minimumQualifyingSubtotal??0),maximumDiscount=String(raw.maximumDiscount??0),customerLimit=Number(raw.perCustomerLimit??1);
 const minUnit=String(raw.minimumUnitPrice??0),maxUnit=String(raw.maximumUnitPrice??0),minimumItems=Number(raw.minimumItems??1);
 if(!money(minQualifying)||!money(maximumDiscount)||!money(minUnit)||!money(maxUnit)||Number(maxUnit)>0&&Number(maxUnit)<Number(minUnit)||!Number.isSafeInteger(minimumItems)||minimumItems<1||minimumItems>100||!Number.isSafeInteger(customerLimit)||customerLimit<1||customerLimit>100)return null;
 if(kind==='fixed'&&Number(maximumDiscount)>0)return null;
 for(const flag of ['firstOrderOnly','excludeSaleProducts','includeSubcategories']){
  if(raw[flag]!==undefined&&typeof raw[flag]!=='boolean')return null;
 }
 return {code,kind,value:v,minimumSubtotal:minimum,maxRedemptions,startsAt,expiresAt,
  eligibility:{scope,productIds,categoryIds,excludedProductIds,minimumQualifyingSubtotal:minQualifying,
   maximumDiscount,minimumUnitPrice:minUnit,maximumUnitPrice:maxUnit,minimumItems,perCustomerLimit:customerLimit,firstOrderOnly:raw.firstOrderOnly===true,
   excludeSaleProducts:raw.excludeSaleProducts===true,includeSubcategories:raw.includeSubcategories!==false}};
}
// Preview only: an actual checkout needs server-verified qualifying items, locked usage counters,
// tax recalculation and snapshots across Razorpay capture/refund/retry. Do not call this from checkout.
export function draftDiscountPaise(draft,subtotalPaise){
 if(typeof subtotalPaise!=='bigint'||subtotalPaise<0n)throw new Error('Invalid subtotal');
 const rate=BigInt(Math.round(Number(draft.value)*100));
 if(draft.kind==='percent')return subtotalPaise*rate/10000n;
 if(draft.kind==='fixed'){const fixed=BigInt(Math.round(Number(draft.value)*100));return subtotalPaise<fixed?subtotalPaise:fixed;}
 throw new Error('Unknown discount type');
}
