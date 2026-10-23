import {toPaise,fromPaise} from './cartPricing.js';
import {draftDiscountPaise} from './couponDraftRules.js';

// Real catalogue fixtures from the database, but strictly a READ-ONLY, non-payment test.
// Never call this method to calculate an order total without transactional redemption.
export function testCouponAgainstCatalogue(draft,items,products,categories,at=new Date()){
 const rules=draft.eligibility||{};
 const parents=new Map(categories.map(c=>[String(c.id),String(c.parent_id||'')]));
 const matchingCategory=id=>{
   let cursor=String(id), steps=0;
   while(cursor&&steps++<32){
    if((rules.categoryIds||[]).map(String).includes(cursor))return true;
    if(rules.includeSubcategories===false)break;
    cursor=parents.get(cursor)||'';
   }
   return false;
 };
 const byId=new Map(products.map(p=>[String(p.id),p]));
 const reasons=[];
 const now=at.getTime();
 if(draft.startsAt&&Date.parse(draft.startsAt)>now)reasons.push('Coupon is not active yet.');
 if(draft.expiresAt&&Date.parse(draft.expiresAt)<=now)reasons.push('Coupon has expired.');
 if(rules.firstOrderOnly)reasons.push('First-order eligibility needs a customer account and cannot be verified in the anonymous admin sample.');
 let subtotal=0n, qualifying=0n, eligibleQty=0;
 for(const item of items){
  const product=byId.get(String(item.productId));
  if(!product||product.is_active===false||product.category_active===false){reasons.push(`Product #${item.productId} is unavailable.`);continue;}
  const price=toPaise(product.price), qty=BigInt(item.quantity), itemTotal=price*qty;
  subtotal+=itemTotal;
  const permitted=!(rules.excludedProductIds||[]).map(String).includes(String(product.id)) &&
    (rules.scope==='order'||rules.scope==='products'&&(rules.productIds||[]).map(String).includes(String(product.id))||rules.scope==='categories'&&matchingCategory(product.category_id)) &&
    (!rules.excludeSaleProducts||!product.show_sale_badge) && price>=toPaise(rules.minimumUnitPrice||0) &&
    (toPaise(rules.maximumUnitPrice||0)===0n||price<=toPaise(rules.maximumUnitPrice||0));
  if(permitted){qualifying+=itemTotal;eligibleQty+=item.quantity;}
 }
 if(subtotal<toPaise(draft.minimumSubtotal||0))reasons.push('Cart subtotal does not reach the minimum.');
 if(qualifying<toPaise(rules.minimumQualifyingSubtotal||0))reasons.push('Eligible item spend is below the minimum.');
 if(eligibleQty<Number(rules.minimumItems||1))reasons.push('Not enough qualifying items.');
 if(qualifying===0n)reasons.push('No matching product for this coupon.');
 const eligible=reasons.length===0;
 let discount=eligible?draftDiscountPaise(draft,qualifying):0n;
 if(draft.kind==='percent'&&toPaise(rules.maximumDiscount||0)>0n){const cap=toPaise(rules.maximumDiscount);if(discount>cap)discount=cap;}
 if(discount>subtotal)discount=subtotal;
 return {eligible,subtotal:fromPaise(subtotal),qualifyingSubtotal:fromPaise(qualifying),eligibleQuantity:eligibleQty,
  discount:fromPaise(discount),reasons,disclaimer:'Read-only catalogue test. Does not verify remaining redemption counters, customer limits, current SKU inventory, GST, shipping, Razorpay settlement or refunds. No checkout discount was applied.'};
}
