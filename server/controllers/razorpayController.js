import {canonicalIndianState} from '../services/indianStates.js';
import { createHash } from 'node:crypto';
import { attachOrderImages } from '../services/orderImages.js';
import { processRefundWebhook } from './razorpayRefundController.js';
import { notifyAdmins } from '../services/notificationService.js';
import {queueOrderEmail} from '../services/customerEmailOutbox.js';
import pool from '../config/db.js';
import {broadcastOrderChange,broadcastAdmins,broadcastAreas} from '../services/realtime.js';
import { fromPaise, validateCartItems } from '../services/cartPricing.js';
import { calculateCheckout } from '../services/checkoutPricing.js';
import { acceptedQuoteError, quoteMatchesAccepted, quoteSummary } from '../services/checkoutAcceptance.js';
import {quoteLiveCoupon,normalizedCouponCode,saveCouponRedemption} from '../services/liveCoupons.js';
import { deductStock } from '../services/stockDeduction.js';
import { makeOrderLine, normalizeAddress, validOrderId, validRequestKey, validateAddress } from '../services/codOrderRules.js';
import { razorpaySettings, createGatewayOrder, fetchGatewayPayment,
  fetchGatewayOrder, fetchGatewayOrderPayments, capturedPaymentMatches,
  verifyCheckoutSignature, verifyWebhookSignature, validGatewayIdentifier } from '../services/razorpayService.js';

const paymentJson = order => ({
  id:String(order.id), status:order.status, paymentStatus:order.payment_status,
  paymentMethod:order.payment_method, couponCode:order.coupon_code||null, discountAmount:order.discount_amount||'0.00', paymentId:order.razorpay_payment_id ?? null,
  paymentReviewNote:order.payment_review_note ?? null,
});
const rollback = async db => { await db.query('ROLLBACK').catch(()=>{}); };
const fail = (res,e,scope) => {
  console.error(scope,e);
  if (['40001','40P01','23505','NX_STOCK_CHANGED'].includes(e.code))return res.status(409).json({message:'Stock or payment changed. Refresh and try again.',requiresCartReview:true});
  if (['42P01','42703'].includes(e.code))return res.status(503).json({message:'Payment processing is temporarily unavailable.'});
  if (e.code==='NX_RAZORPAY_API' || e.name==='AbortError')return res.status(503).json({message:'Razorpay is temporarily unavailable. Check your order status before retrying.'});
  return res.status(500).json({message:'Payment operation could not be completed. Check your order status.'});
};
async function addressFor(db, user, body) {
  if (body?.addressId != null) {
    if (!validOrderId(body.addressId)) return {error:'Invalid saved address.'};
    const result=await db.query('SELECT * FROM customer_addresses WHERE customer_id=$1 AND id=$2 FOR SHARE',[user,body.addressId]);
    const a=result.rows[0]; if (!a)return {error:'Saved address not found.'};
    if (!canonicalIndianState(a.state)) return {error:'Your saved address has an unrecognized state. Please edit your address.'};
    return {address:{fullName:a.full_name,phone:a.phone,addressLine1:a.address_line1,addressLine2:a.address_line2,city:a.city,state:a.state,pincode:a.pincode}};
  }
  const error=validateAddress(body?.address);
  return error?{error}:{address:normalizeAddress(body.address)};
}
async function quoteLines(db,items,policy,lock=true) {
  const productIds=[...new Set(items.map(x=>x.productId))];
  const variants=[...new Set(items.map(x=>x.variantId).filter(Boolean))];
  const [p,v,required]=await Promise.all([
    db.query(`SELECT p.id,p.name,p.price,p.stock,p.image_url,p.is_active,p.gst_percent,p.category_id,p.show_sale_badge,c.is_active AS category_active
       FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=ANY($1::bigint[]) ORDER BY p.id ${lock?'FOR UPDATE OF p':''}`,[productIds]),
    variants.length?db.query(`SELECT id,product_id,sku,attributes,price,stock,is_active FROM product_variants WHERE id=ANY($1::bigint[]) ORDER BY id ${lock?'FOR UPDATE':''}`,[variants]):Promise.resolve({rows:[]}),
    db.query('SELECT DISTINCT product_id FROM product_variants WHERE product_id=ANY($1::bigint[])',[productIds]),
  ]);
  const pm=new Map(p.rows.map(x=>[String(x.id),x]));const vm=new Map(v.rows.map(x=>[String(x.id),x]));
  const has=new Set(required.rows.map(x=>String(x.product_id)));
  const result=[];
  for (const item of items){
    const p=pm.get(item.productId);
    const line=makeOrderLine(item,p,item.variantId?vm.get(item.variantId):null,has.has(item.productId));
    if (line.error)return {error:line.error};
    result.push({...line,gstPercent:p.gst_percent??policy.default_item_gst_percent,categoryId:p.category_id,showSaleBadge:p.show_sale_badge});
  }
  return {lines:await attachOrderImages(db,result)};
}
function intentDigest(items, body) {
  return createHash('sha256').update(JSON.stringify({items:[...items].sort((a,b)=>`${a.productId}:${a.variantId??''}`.localeCompare(`${b.productId}:${b.variantId??''}`)),
    addressId:body.addressId??null,address:body.addressId?null:body.address,paymentMethod:'razorpay',...(normalizedCouponCode(body.couponCode)?{couponCode:normalizedCouponCode(body.couponCode)}:{})})).digest('hex');
}
function paymentCheckout(order) {
  return {gatewayOrderId:order.razorpay_order_id,orderId:String(order.id),
    keyId:razorpaySettings().keyId,currency:'INR',amountPaise:Number(String(order.grand_total).replace('.',''))};
}
export function paymentConfig(_req,res) {
  const settings=razorpaySettings();
  return res.json({enabled:settings.enabled,keyId:settings.keyId,mode:settings.mode});
}
export async function initiateRazorpayOrder(req,res) {
  const key=razorpaySettings();
  if (!key.enabled)return res.status(503).json({message:'Online payments are not configured for this store.'});
  const {items,requestKey,paymentMethod} =req.body||{};
  const couponCode=normalizedCouponCode(req.body?.couponCode);
  if(couponCode===null)return res.status(400).json({message:'Invalid coupon code.'});
  const itemError=validateCartItems(items);
  if (itemError || !items?.length)return res.status(400).json({message:itemError||'Cart is empty.'});
  if (paymentMethod!=='razorpay' || !validRequestKey(requestKey))return res.status(400).json({message:'Invalid payment request.'});
  const quoteError=acceptedQuoteError(req.body?.acceptedQuote);
  if (quoteError)return res.status(400).json({message:quoteError});
  const requestedDigest=intentDigest(items,req.body);
  try {
    const existing=await pool.query('SELECT * FROM cod_orders WHERE customer_id=$1 AND request_key=$2',[req.user.id,requestKey]);
    if(existing.rows.length){
      const order=existing.rows[0];
      if(order.payment_method!=='razorpay'||order.request_digest!==requestedDigest)return res.status(409).json({message:'Request key already used for a different checkout.'});
      if(order.payment_status==='razorpay_paid')return res.json({alreadyPaid:true,order:paymentJson(order)});
      if(order.payment_status==='razorpay_pending'&&order.razorpay_order_id)return res.json({payment:paymentCheckout(order),alreadyInitiated:true});
      return res.status(409).json({message:'Payment requires review. Please contact support.'});
    }
    const pending=await pool.query("SELECT * FROM cod_orders WHERE customer_id=$1 AND request_digest=$2 AND payment_status='razorpay_pending' ORDER BY id DESC LIMIT 1",[req.user.id,requestedDigest]);
    if(pending.rows.length){
      const order=pending.rows[0];
      if(String(req.body.acceptedQuote.total)!==String(order.grand_total))return res.status(409).json({message:'A pending payment has an earlier quote. Review Orders before proceeding.'});
      return res.json({payment:paymentCheckout(order),alreadyInitiated:true});
    }
  }catch(err){return fail(res,err,'Payment idempotency check:');}
  // PREPARE OUTSIDE A DB TRANSACTION: the gateway is a network service. A
  // fresh authoritative, locking re-quote is performed in the short commit TX.
  // An unused gateway order can exist after a race, but no stock/coupon is lost.
  let gateway;
  try {
    const address=await addressFor(pool,req.user.id,req.body);
    if(address.error)return res.status(400).json({message:address.error});
    const settings=await pool.query('SELECT * FROM store_checkout_settings WHERE id=1');
    if(!settings.rows.length)return res.status(503).json({message:'Checkout temporarily unavailable.'});
    const found=await quoteLines(pool,items,settings.rows[0],false);
    if(found.error)return res.status(409).json({message:found.error,requiresCartReview:true});
    const coupon=await quoteLiveCoupon(pool,couponCode,req.user.id,found.lines);
    if(coupon.error)return res.status(422).json({message:coupon.error});
    const amounts=calculateCheckout(found.lines,address.address.state,settings.rows[0],coupon);
    if(amounts._total<=0n||amounts._total>999999999999n)return res.status(400).json({message:'Invalid payment amount.'});
    if(!quoteMatchesAccepted(amounts,req.body.acceptedQuote))return res.status(409).json({message:'Checkout amount changed. Review the new quote before paying.',requiresEstimateReview:true,latestEstimate:quoteSummary(amounts)});
    gateway=await createGatewayOrder({amount:Number(amounts._total),currency:'INR',receipt:`nx_${requestKey.replaceAll('-','').slice(0,32)}`,partial_payment:false});
    if(!validGatewayIdentifier(gateway.id,'order')||gateway.amount!==Number(amounts._total)||gateway.currency!=='INR')throw Object.assign(new Error('Gateway response mismatch'),{code:'NX_RAZORPAY_API'});
  } catch(err){return fail(res,err,'Payment preflight:');}
  const digest=intentDigest(items,req.body);const db=await pool.connect();let begun=false;
  try {
    await db.query('BEGIN');begun=true;
    // Lock customer row so duplicate clicks with the same key cannot reserve stock twice.
    const owner=await db.query("SELECT id FROM users WHERE id=$1 AND role='customer' FOR UPDATE",[req.user.id]);
    if (!owner.rows.length){await rollback(db);begun=false;return res.status(403).json({message:'Customer unavailable.'});}
    const existing=await db.query('SELECT * FROM cod_orders WHERE customer_id=$1 AND request_key=$2',[req.user.id,requestKey]);
    if (existing.rows.length){
      const order=existing.rows[0];await db.query('COMMIT');begun=false;
      if (order.payment_method!=='razorpay'||order.request_digest!==digest)return res.status(409).json({message:'Request key already used for another checkout.'});
      if (order.payment_status==='razorpay_paid')return res.json({alreadyPaid:true,order:paymentJson(order)});
      if (order.payment_status!=='razorpay_pending'||!order.razorpay_order_id)return res.status(409).json({message:'This payment requires store review. Please contact support.'});
      return res.json({payment:paymentCheckout(order),alreadyInitiated:true});
    }
    // Recover a pending checkout after browser reload (fresh requestKey, identical cart + address).
    // Never reserve the same items twice for an identical still-pending intent.
    const pending=await db.query(`SELECT * FROM cod_orders WHERE customer_id=$1 AND request_digest=$2
      AND payment_method='razorpay' AND payment_status='razorpay_pending' ORDER BY id DESC LIMIT 1`,[req.user.id,digest]);
    if(pending.rows.length){
      const order=pending.rows[0];
      if(String(req.body.acceptedQuote.total)!==String(order.grand_total)){
        await rollback(db);begun=false;return res.status(409).json({message:'A previous checkout for these items is still awaiting payment. Check Orders before paying again.'});
      }
      await db.query('COMMIT');begun=false;
      return res.json({payment:paymentCheckout(order),alreadyInitiated:true});
    }
    const pendingCount=await db.query("SELECT COUNT(*)::int AS count FROM cod_orders WHERE customer_id=$1 AND payment_status='razorpay_pending'",[req.user.id]);
    if(pendingCount.rows[0].count>=3){
      await rollback(db);begun=false;
      return res.status(409).json({message:'You already have several pending online checkouts. Open Orders to complete or review them before starting another.'});
    }
    const address=await addressFor(db,req.user.id,req.body);
    if(address.error){await rollback(db);begun=false;return res.status(400).json({message:address.error});}
    const policyResult=await db.query('SELECT * FROM store_checkout_settings WHERE id=1 FOR SHARE');
    if (!policyResult.rows.length)throw new Error('Missing checkout settings');
    const policy=policyResult.rows[0];
    const found=await quoteLines(db,items,policy);
    if(found.error){await rollback(db);begun=false;return res.status(409).json({message:found.error,requiresCartReview:true});}
    const coupon=await quoteLiveCoupon(db,couponCode,req.user.id,found.lines,{lock:true});
    if(coupon.error){await rollback(db);begun=false;return res.status(422).json({message:coupon.error});}
    const amounts=calculateCheckout(found.lines,address.address.state,policy,coupon);
    if(amounts._total<=0n || amounts._total>999999999999n){await rollback(db);begun=false;return res.status(400).json({message:'Invalid payment amount.'});}
    if(!quoteMatchesAccepted(amounts,req.body.acceptedQuote)){
      await rollback(db);begun=false;
      return res.status(409).json({message:'Checkout amount changed. Review the new quote before paying.',requiresEstimateReview:true,latestEstimate:quoteSummary(amounts)});
    }
    // Never wait for Razorpay with product locks held. The gateway was prepared
    // before BEGIN; this authoritative quote checks race conditions again.
    if(!gateway){await rollback(db);begun=false;return res.status(409).json({message:'An earlier checkout is being processed. Refresh your orders and retry.'});}
    if(gateway.amount!==Number(amounts._total)){
      await rollback(db);begun=false;return res.status(409).json({message:'Checkout changed while processing. Please review and retry.',requiresEstimateReview:true,latestEstimate:quoteSummary(amounts)});
    }
    const r=await db.query(`INSERT INTO cod_orders(customer_id,request_key,request_digest,status,payment_method,payment_status,
      subtotal,shipping_fee,grand_total,address_snapshot,tax_total,taxable_value,cgst,sgst,igst,razorpay_order_id,tax_pricing_mode,coupon_code,discount_amount)
      VALUES($1,$2,$3,'payment_pending','razorpay','razorpay_pending',$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [req.user.id,requestKey,digest,amounts.subtotal,amounts.shippingFee,amounts.total,
        JSON.stringify(address.address),amounts.includedTax,amounts.taxableValue,amounts.cgst,amounts.sgst,amounts.igst,gateway.id,amounts.taxPricingMode,coupon.code,amounts.discountAmount]);
    const order=r.rows[0];
    await saveCouponRedemption(db,coupon,req.user.id,order.id,'reserved');
    for(const [i,line] of found.lines.entries()){
      await db.query(`INSERT INTO cod_order_items(order_id,product_id,variant_id,name_snapshot,sku_snapshot,attributes_snapshot,image_snapshot,quantity,unit_price,line_total,gst_percent,included_tax,discount_amount)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13)`,[order.id,line.productId,line.variantId,line.name,line.sku,JSON.stringify(line.attributes),line.imageUrl,line.quantity,
        fromPaise(line.unitPrice),fromPaise(line.lineTotal),line.gstPercent,amounts.itemTaxes[i],fromPaise(coupon.allocations[i])]);
      await deductStock(db,line);
    }
    await db.query("INSERT INTO cod_order_events(order_id,event_type,actor_user_id) VALUES($1,'payment_pending',$2)",[order.id,req.user.id]);
    await db.query('COMMIT');begun=false;
    return res.status(201).json({payment:paymentCheckout(order),alreadyInitiated:false});
  }catch(e){if(begun)await rollback(db);return fail(res,e,'Initiate Razorpay:');}finally{db.release();}
}
async function applyCapturedPayment(db,order,payment,actorId=null){
  if(!capturedPaymentMatches(payment,order))return {error:'Payment amount, currency, order or captured status does not match.'};
  if(['razorpay_paid','razorpay_refunded'].includes(order.payment_status)){
    return order.razorpay_payment_id===payment.id?{order,alreadyPaid:true}:{error:'Order was already paid with another transaction.'};
  }
  if(order.payment_method!=='razorpay')return {error:'Payment method mismatch.'};
  if(order.payment_status==='razorpay_expired'||order.status==='payment_expired'||order.payment_status==='razorpay_review'){
    const changed=await db.query(`UPDATE cod_orders SET status='payment_review',payment_status='razorpay_review',
      razorpay_payment_id=$2,payment_review_note=$3,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [order.id,payment.id,'Payment captured after reservation expired or entered review; verify stock and refund manually.']);
    await db.query("INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'payment_review',$2,$3)",
      [order.id,actorId,'Captured payment requires manual stock/refund review.']);
    return {order:changed.rows[0],review:true};
  }
  if(order.status!=='payment_pending'||order.payment_status!=='razorpay_pending')return {error:'Order not eligible for online payment confirmation.'};
  const changed=await db.query(`UPDATE cod_orders SET status='placed',payment_status='razorpay_paid',
    razorpay_payment_id=$2,paid_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[order.id,payment.id]);
  await db.query("UPDATE coupon_redemptions SET status='consumed',updated_at=NOW() WHERE order_id=$1 AND status='reserved'",[order.id]);
  await db.query("INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'payment_verified',$2,$3)",
    [order.id,actorId,'Razorpay captured payment verified.']);
  await queueOrderEmail(db,order.id,'payment_verified');
  await notifyAdmins(db,{key:`order:${order.id}:paid`,kind:'order',title:'New paid order',message:`Razorpay payment for order #${order.id} verified. Ready for fulfillment.`,path:'/admin/orders'});
  return {order:changed.rows[0],paid:true};
}
export async function verifyRazorpayOrder(req,res){
  const {orderId,razorpay_order_id:gatewayId,razorpay_payment_id:paymentId,razorpay_signature:signature}=req.body||{};
  if(!validOrderId(orderId)||!validGatewayIdentifier(gatewayId,'order')||!validGatewayIdentifier(paymentId,'pay')||typeof signature!=='string')return res.status(400).json({message:'Invalid payment verification.'});
  try{
    const found=await pool.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2',[orderId,req.user.id]);
    const order=found.rows[0];if(!order)return res.status(404).json({message:'Order not found.'});
    if(order.payment_method!=='razorpay'||gatewayId!==order.razorpay_order_id || !verifyCheckoutSignature(order.razorpay_order_id,paymentId,signature))
      return res.status(400).json({message:'Payment signature verification failed.'});
    const payment=await fetchGatewayPayment(paymentId);
    if(payment.status!=='captured')return res.status(202).json({paymentStatus:'razorpay_pending',message:'Payment not captured yet. Check your order status shortly.'});
    const db=await pool.connect();let begun=false;
    try{
      await db.query('BEGIN');begun=true;
      const locked=await db.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2 FOR UPDATE',[orderId,req.user.id]);
      const result=await applyCapturedPayment(db,locked.rows[0],payment,req.user.id);
      if(result.error){await rollback(db);begun=false;return res.status(409).json({message:result.error});}
      await db.query('COMMIT');begun=false;
      return res.json({order:paymentJson(result.order),paid:Boolean(result.paid||result.alreadyPaid),needsReview:Boolean(result.review)});
    }catch(e){if(begun)await rollback(db);return fail(res,e,'Verify and update Razorpay:');}finally{db.release();}
  }catch(e){return fail(res,e,'Verify Razorpay:');}
}
export async function retryRazorpayCheckout(req,res) {
  if(!validOrderId(req.params.id))return res.status(400).json({message:'Invalid order ID.'});
  try{
    const found=await pool.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2',[req.params.id,req.user.id]);
    const order=found.rows[0];if(!order)return res.status(404).json({message:'Order not found.'});
    if(order.payment_method!=='razorpay')return res.status(400).json({message:'This is not a Razorpay order.'});
    if(order.payment_status==='razorpay_paid')return res.json({alreadyPaid:true,order:paymentJson(order)});
    if(order.payment_status!=='razorpay_pending'||!order.razorpay_order_id)
      return res.status(409).json({message:'This payment is not available for retry; contact store support.'});
    if(!razorpaySettings().enabled)return res.status(503).json({message:'Razorpay is unavailable.'});
    return res.json({payment:paymentCheckout(order),customer:order.address_snapshot});
  }catch(e){return fail(res,e,'Retry Razorpay checkout:');}
}
export async function myRazorpayPaymentStatus(req,res){
  if(!validOrderId(req.params.id))return res.status(400).json({message:'Invalid order ID.'});
  try{
    const result=await pool.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2',[req.params.id,req.user.id]);
    const order=result.rows[0];if(!order)return res.status(404).json({message:'Order not found.'});
    if(order.payment_method!=='razorpay')return res.status(400).json({message:'Not an online payment.'});
    // Payment state is persisted from authenticated checkout callbacks and webhooks;
    // browsing this endpoint cannot modify or falsely mark an order paid.
    return res.json({order:paymentJson(order)});
  }catch(e){return fail(res,e,'Razorpay status:');}
}
// Safe customer-triggered reconciliation for closed tabs, lost callbacks and delayed webhooks.
// Uses Razorpay's authenticated server API, never a shopper-supplied payment status.
export async function reconcileRazorpayOrder(req,res) {
  if(!validOrderId(req.params.id))return res.status(400).json({message:'Invalid order ID.'});
  try {
    const found=await pool.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2',[req.params.id,req.user.id]);
    const order=found.rows[0];
    if(!order)return res.status(404).json({message:'Order not found.'});
    if(order.payment_method!=='razorpay')return res.status(400).json({message:'Not a Razorpay order.'});
    if(order.payment_status==='razorpay_paid')return res.json({order:paymentJson(order),paid:true});
    if(order.payment_status==='razorpay_review')return res.json({order:paymentJson(order),needsReview:true});
    const [gateway,payments]=await Promise.all([fetchGatewayOrder(order.razorpay_order_id),fetchGatewayOrderPayments(order.razorpay_order_id)]);
    if(gateway.id!==order.razorpay_order_id||!Array.isArray(payments.items))throw new Error('Unexpected Razorpay order lookup');
    const captured=payments.items.filter(x=>x.status==='captured');
    if(captured.length===0)return res.json({order:paymentJson(order),paid:false,message:'No captured payment found. You can retry a pending checkout.'});
    if(captured.length!==1)return res.status(409).json({message:'Multiple captured payments were found; contact the store for reconciliation.'});
    const db=await pool.connect();let begun=false;
    try {
      await db.query('BEGIN');begun=true;
      const locked=await db.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2 FOR UPDATE',[order.id,req.user.id]);
      const applied=await applyCapturedPayment(db,locked.rows[0],captured[0],req.user.id);
      if(applied.error){await rollback(db);begun=false;return res.status(409).json({message:applied.error});}
      await db.query('COMMIT');begun=false;
      return res.json({order:paymentJson(applied.order),paid:Boolean(applied.paid||applied.alreadyPaid),needsReview:Boolean(applied.review)});
    }catch(e){if(begun)await rollback(db);return fail(res,e,'Reconcile Razorpay payment:');}finally{db.release();}
  }catch(e){return fail(res,e,'Fetch Razorpay payment:');}
}
export async function razorpayWebhook(req,res){
  if(!verifyWebhookSignature(req.body,req.get('x-razorpay-signature')))
    return res.status(400).json({message:'Invalid webhook signature.'});
  const eventId=req.get('x-razorpay-event-id');
  if(!eventId||eventId.length>150||!/^[A-Za-z0-9_-]+$/.test(eventId))return res.status(400).json({message:'Invalid webhook event ID.'});
  let payload;
  try{payload=JSON.parse(req.body.toString('utf8'));}catch{return res.status(400).json({message:'Invalid event data.'});}
  const type=payload?.event;
  if(typeof type!=='string'||type.length>80)return res.status(400).json({message:'Invalid webhook event.'});
  const payment=payload?.payload?.payment?.entity;
  if(type==='payment.captured'&&(!validGatewayIdentifier(payment?.id,'pay')||!validGatewayIdentifier(payment?.order_id,'order')))
    return res.status(400).json({message:'Invalid captured-payment payload.'});
  const db=await pool.connect();let begun=false;
  try{
    await db.query('BEGIN');begun=true;
    const logged=await db.query(`INSERT INTO razorpay_webhook_events(event_id,event_type) VALUES($1,$2)
      ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,[eventId,type]);
    if(!logged.rows.length){await db.query('COMMIT');begun=false;return res.json({received:true,duplicate:true});}
    if(['refund.created','refund.processed','refund.failed'].includes(type)){
      const refund=payload?.payload?.refund?.entity;
      const applied=await processRefundWebhook(db,refund);
      if(applied.error){await rollback(db);begun=false;return res.status(409).json({message:'Refund needs reconciliation.'});}
    }
    if(type==='payment.captured'){
      const found=await db.query('SELECT * FROM cod_orders WHERE razorpay_order_id=$1 FOR UPDATE',[payment.order_id]);
      if(!found.rows.length){
        // Genuine but unlinked event: do not acknowledge as processed; Razorpay can retry.
        await rollback(db);begun=false;return res.status(503).json({message:'Payment order not yet registered.'});
      }
      const applied=await applyCapturedPayment(db,found.rows[0],payment);
      if(applied.error){await rollback(db);begun=false;return res.status(409).json({message:'Payment requires manual reconciliation.'});}
    }
    // payment.failed does not release stock: the same Razorpay order can be retried.
    await db.query('COMMIT');begun=false;
    if(type==='payment.captured'||type.startsWith('refund.')){
      broadcastAdmins(['orders','finance','notifications','analytics','inventory']);
      broadcastAreas(['catalog','inventory']);
      const identifier=type==='payment.captured'?payment?.order_id:payload?.payload?.refund?.entity?.payment_id;
      if(identifier){
        const query=type==='payment.captured'?'SELECT id FROM cod_orders WHERE razorpay_order_id=$1':'SELECT id FROM cod_orders WHERE razorpay_payment_id=$1';
        pool.query(query,[identifier]).then(result=>Promise.all(result.rows.map(row=>broadcastOrderChange(row.id)))).catch(error=>console.error('Realtime webhook refresh:',error));
      }
    }
    return res.json({received:true});
  }catch(e){if(begun)await rollback(db);return fail(res,e,'Razorpay webhook:');}finally{db.release();}
}
// Shared by the admin endpoint and the periodic, fail-closed sweeper.
// Provider lookups happen BEFORE a short inventory/coupon release transaction.
export async function expirePendingReservation(id,actorId=null){
  if(!validOrderId(id))return {status:400,message:'Invalid order ID.'};
  const found=await pool.query('SELECT * FROM cod_orders WHERE id=$1',[id]);
  const order=found.rows[0];
  if(!order)return {status:404,message:'Order not found.'};
  if(order.payment_method!=='razorpay'||order.status!=='payment_pending'||order.payment_status!=='razorpay_pending')return {status:409,message:'Only pending online payments can be expired.'};
  if(Date.now()-new Date(order.placed_at).getTime()<60*60*1000)return {status:409,message:'Payment hold has not reached its expiry window.'};
  const [gateway,payments]=await Promise.all([fetchGatewayOrder(order.razorpay_order_id),fetchGatewayOrderPayments(order.razorpay_order_id)]);
  if(gateway.id!==order.razorpay_order_id||gateway.status==='paid'||!Array.isArray(payments.items)||
    payments.items.some(payment=>['authorized','captured','refunded'].includes(payment.status)))
    return {status:409,message:'Gateway reports payment activity. No stock was released; manual reconciliation required.'};
  const db=await pool.connect();let begun=false;
  try {
    await db.query('BEGIN');begun=true;
    const locked=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[id]);
    if(locked.rows[0]?.payment_status!=='razorpay_pending'||locked.rows[0]?.status!=='payment_pending'){
      await rollback(db);begun=false;return {status:409,message:'Payment changed during reconciliation.'};
    }
    const lines=await db.query('SELECT product_id,variant_id,quantity FROM cod_order_items WHERE order_id=$1 ORDER BY id',[id]);
    for(const line of lines.rows){
      if(line.variant_id)await db.query('UPDATE product_variants SET stock=stock+$1,updated_at=NOW() WHERE id=$2',[line.quantity,line.variant_id]);
      else await db.query('UPDATE products SET stock=stock+$1 WHERE id=$2',[line.quantity,line.product_id]);
    }
    await db.query("UPDATE coupon_redemptions SET status='released',updated_at=now() WHERE order_id=$1 AND status='reserved'",[id]);
    const updated=await db.query("UPDATE cod_orders SET status='payment_expired',payment_status='razorpay_expired',updated_at=NOW() WHERE id=$1 RETURNING *",[id]);
    await db.query("INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'payment_expired',$2,$3)",
      [id,actorId,actorId?'Administrator expired unpaid reservation after gateway verification.':'Automatic reconciliation released an unpaid reservation after provider verification.']);
    await db.query('COMMIT');begun=false;
    return {status:200,order:paymentJson(updated.rows[0])};
  } catch(err){if(begun)await rollback(db);throw err;}finally{db.release();}
}
export async function expirePendingOnlineOrder(req,res){
 try {const result=await expirePendingReservation(req.params.id,req.user.id);
   return res.status(result.status).json(result.order?{order:result.order}:{message:result.message});}
 catch(err){return fail(res,err,'Expire pending payment:');}
}
