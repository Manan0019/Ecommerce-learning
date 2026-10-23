import {toPaise} from './cartPricing.js';
import {validateCouponDraft,draftDiscountPaise} from './couponDraftRules.js';

const CODE=/^[A-Z0-9][A-Z0-9_-]{2,23}$/;
export function normalizedCouponCode(raw){
  if(raw===undefined||raw===null||raw==='')return '';
  if(typeof raw!=='string')return null;
  const code=raw.trim().toUpperCase();
  return CODE.test(code)?code:null;
}
// Pure, deterministic paise allocations; last eligible line absorbs rounding remainder.
export function allocateCouponDiscount(lines,eligibleIndexes,discount){
 if(typeof discount!=='bigint'||discount<0n)throw new Error('Invalid discount');
 const result=lines.map(()=>0n);
 if(discount===0n)return result;
 const eligible=eligibleIndexes.filter(i=>Number.isInteger(i)&&i>=0&&i<lines.length);
 if(new Set(eligible).size!==eligible.length)throw new Error('Duplicate eligible line');
 const subtotal=eligible.reduce((sum,i)=>sum+lines[i].lineTotal,0n);
 if(subtotal<=0n||discount>subtotal)throw new Error('Coupon exceeds eligible items');
 let remaining=discount;
 for(let j=0;j<eligible.length;j++){
  const i=eligible[j];
  const portion=j===eligible.length-1?remaining:discount*lines[i].lineTotal/subtotal;
  result[i]=portion;remaining-=portion;
 }
 return result;
}
const empty=lines=>({code:null,discountPaise:0n,allocations:lines.map(()=>0n)});
/** Preview or reserve under a database transaction. Final transaction must hold
 * the customer row lock and the coupon row lock until the redemption is written. */
export async function quoteLiveCoupon(db,rawCode,customerId,lines,{lock=false}={}){
 const code=normalizedCouponCode(rawCode);
 if(code===null)return {error:'Enter a valid coupon code.'};
 if(!code)return empty(lines);
 if(process.env.COUPON_REDEMPTION_ENABLED!=='true')return {error:'Coupon redemption is not enabled by this store yet.'};
 const found=await db.query(`SELECT * FROM coupon_drafts WHERE code=$1 ${lock?'FOR UPDATE':''}`,[code]);
 if(!found.rows.length)return {error:'Coupon code not found.'};
 const row=found.rows[0];
 if(!row.is_active)return {error:'This coupon is not active.'};
 const rule=validateCouponDraft({code:row.code,kind:row.discount_kind,value:row.discount_value,
  minimumSubtotal:row.minimum_subtotal,maxRedemptions:row.max_redemptions,startsAt:row.starts_at,
  expiresAt:row.expires_at,...(row.eligibility||{})});
 if(!rule)return {error:'Coupon configuration needs administrator review.'};
 const now=Date.now();
 if(rule.startsAt&&Date.parse(rule.startsAt)>now)return {error:'This coupon has not started yet.'};
 if(rule.expiresAt&&Date.parse(rule.expiresAt)<=now)return {error:'This coupon has expired.'};
 const limits=await db.query(`SELECT COUNT(*)::int AS used,
  COUNT(*) FILTER (WHERE customer_id=$2)::int AS customer_uses
  FROM coupon_redemptions WHERE code=$1 AND status IN ('reserved','consumed')`,[code,customerId]);
 const used=limits.rows[0];
 if(used.used>=rule.maxRedemptions)return {error:'This coupon has reached its usage limit.'};
 if(used.customer_uses>=rule.eligibility.perCustomerLimit)return {error:'You have reached the usage limit for this coupon.'};
 if(rule.eligibility.firstOrderOnly){
  const count=await db.query(`SELECT 1 FROM cod_orders WHERE customer_id=$1
    AND status NOT IN ('cancelled','payment_expired') LIMIT 1`,[customerId]);
  if(count.rows.length)return {error:'This offer is for your first order only.'};
 }
 const categories=rule.eligibility.scope==='categories' ?
   (await db.query('SELECT id,parent_id FROM categories')).rows:[];
 const parents=new Map(categories.map(c=>[String(c.id),String(c.parent_id??'')]));
 const categoriesSet=new Set(rule.eligibility.categoryIds.map(String));
 const productsSet=new Set(rule.eligibility.productIds.map(String));
 const exclusions=new Set(rule.eligibility.excludedProductIds.map(String));
 const matchCategory=id=>{
  let at=String(id||''),steps=0;
  while(at&&steps++<32){if(categoriesSet.has(at))return true;if(!rule.eligibility.includeSubcategories)break;at=parents.get(at)||'';}
  return false;
 };
 const cart=lines.reduce((s,l)=>s+l.lineTotal,0n);
 if(cart<toPaise(rule.minimumSubtotal))return {error:'Cart does not meet the minimum subtotal for this coupon.'};
 const eligible=[];let sum=0n,qty=0;
 lines.forEach((l,i)=>{
  const price=l.unitPrice;
  const allowed=!exclusions.has(String(l.productId)) &&
   (rule.eligibility.scope==='order'||rule.eligibility.scope==='products'&&productsSet.has(String(l.productId))||rule.eligibility.scope==='categories'&&matchCategory(l.categoryId)) &&
   (!rule.eligibility.excludeSaleProducts||!l.showSaleBadge) &&
   price>=toPaise(rule.eligibility.minimumUnitPrice||'0') &&
   (toPaise(rule.eligibility.maximumUnitPrice||'0')===0n||price<=toPaise(rule.eligibility.maximumUnitPrice));
  if(allowed){eligible.push(i);sum+=l.lineTotal;qty+=Number(l.quantity);}
 });
 if(!sum||sum<toPaise(rule.eligibility.minimumQualifyingSubtotal||'0')||qty<rule.eligibility.minimumItems)
  return {error:'Your cart does not meet this coupon’s eligible product or quantity requirements.'};
 let discount=draftDiscountPaise(rule,sum);
 const cap=toPaise(rule.eligibility.maximumDiscount||'0');
 if(rule.kind==='percent'&&cap>0n&&discount>cap)discount=cap;
 if(discount<=0n)return {error:'Coupon discount would be zero.'};
 return {code,discountPaise:discount,allocations:allocateCouponDiscount(lines,eligible,discount)};
}
export async function saveCouponRedemption(db,quote,customerId,orderId,status){
 if(!quote.code)return;
 if(!['reserved','consumed'].includes(status))throw new Error('Invalid coupon redemption status');
 await db.query('INSERT INTO coupon_redemptions(code,customer_id,order_id,status) VALUES($1,$2,$3,$4)',[quote.code,customerId,orderId,status]);
}
