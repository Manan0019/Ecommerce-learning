import pool from '../config/db.js';
import { validOrderId } from '../services/codOrderRules.js';
import { refundWritesEnabled, refundConfiguration, eligibleForFullRefund, totalPaise, refundMatchesOrder, isRefundStatus } from '../services/refundRules.js';
import { createGatewayRefund, fetchGatewayRefunds, fetchGatewayPayment, validGatewayIdentifier } from '../services/razorpayService.js';

function publicRefund(order) {
  return {id:String(order.id),status:order.status,paymentStatus:order.payment_status,
    refundStatus:order.refund_status,refundId:order.razorpay_refund_id||null};
}
async function rollback(db){ await db.query('ROLLBACK').catch(()=>{}); }
function respondError(res,error){
  console.error('Razorpay refund:',error);
  if(['42P01','42703','23514'].includes(error.code))return res.status(503).json({message:'Refund migration 026 must be applied and checked.'});
  if(error.code==='NX_RAZORPAY_API'||error.name==='AbortError')return res.status(503).json({message:'Razorpay did not confirm the refund request. Check refund status; never submit another new refund.'});
  return res.status(500).json({message:'Refund status is uncertain. Reconcile before taking another action.'});
}
function paymentValidForOrder(payment,order){
  return payment?.id===order.razorpay_payment_id && payment?.order_id===order.razorpay_order_id &&
    payment.currency==='INR' && payment.amount===totalPaise(order) && payment.captured===true &&
    payment.status==='captured' && payment.amount_refunded===0;
}
async function addEvent(db,id,actor,type,notes){
  await db.query('INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,$2,$3,$4)',[id,type,actor,notes]);
}
// Called only inside a transaction with the cod_orders row already FOR UPDATE locked.
// The refund state is sourced from Razorpay's API or a signed webhook, not the browser.
export async function applyGatewayRefund(db,order,refund,actorId=null){
  if(!refundMatchesOrder(refund,order)||!isRefundStatus(refund.status)) return {error:'Refund does not match the paid order or approved amount.'};
  if(order.refund_status==='processed' && order.status==='cancelled')return {order,alreadyProcessed:true};
  if(!['refund_pending','refund_review'].includes(order.status)||!['requested','pending','review','failed'].includes(order.refund_status))return {error:'Order not eligible for refund reconciliation.'};
  if(refund.status==='processed'){
    const lines=await db.query('SELECT product_id,variant_id,quantity FROM cod_order_items WHERE order_id=$1 ORDER BY id',[order.id]);
    for(const line of lines.rows){
      if(line.variant_id)await db.query('UPDATE product_variants SET stock=stock+$1,updated_at=NOW() WHERE id=$2',[line.quantity,line.variant_id]);
      else await db.query('UPDATE products SET stock=stock+$1 WHERE id=$2',[line.quantity,line.product_id]);
    }
    const changed=await db.query(`UPDATE cod_orders SET status='cancelled',payment_status='razorpay_refunded',refund_status='processed',
      razorpay_refund_id=$2,refund_processed_at=NOW(),refund_checked_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[order.id,refund.id]);
    await addEvent(db,order.id,actorId,'refund_processed','Razorpay full refund processed; order cancelled and stock restored once.');
    return {order:changed.rows[0],processed:true};
  }
  if(order.refund_status==='failed' && refund.status!=='processed')return {order,review:true};
  if(refund.status==='failed'){
    const changed=await db.query(`UPDATE cod_orders SET status='refund_review',refund_status='failed',razorpay_refund_id=$2,
       refund_checked_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[order.id,refund.id]);
    if(order.refund_status!=='failed')await addEvent(db,order.id,actorId,'refund_review','Razorpay refund failed; manual review required. Stock not released.');
    return {order:changed.rows[0],review:true};
  }
  const changed=await db.query(`UPDATE cod_orders SET status='refund_pending',refund_status='pending',razorpay_refund_id=$2,
      refund_checked_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[order.id,refund.id]);
  if(order.refund_status==='requested')await addEvent(db,order.id,actorId,'refund_pending','Refund accepted by Razorpay and is processing.');
  return {order:changed.rows[0],pending:true};
}
async function applyInTransaction(orderId,refund,actorId){
  const db=await pool.connect();let open=false;
  try{
    await db.query('BEGIN');open=true;
    const row=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
    if(!row.rows.length){await rollback(db);open=false;return {error:'Order not found.'};}
    const applied=await applyGatewayRefund(db,row.rows[0],refund,actorId);
    if(applied.error){await rollback(db);open=false;return applied;}
    await db.query('COMMIT');open=false;return applied;
  }finally{if(open)await rollback(db);db.release();}
}
// Admin-only, read-only status used to explain a missing server opt-in.
export function getRefundConfiguration(_req,res){
  return res.json(refundConfiguration());
}
export async function requestFullRefund(req,res){
  const id=req.params.id,reason=req.body?.reason;
  if(!validOrderId(id)||typeof reason!=='string'||reason.trim().length<10||reason.trim().length>200)
    return res.status(400).json({message:'Enter a refund reason of 10–200 characters.'});
  if(!refundWritesEnabled())return res.status(403).json({
    message:'Refund initiation is disabled on the server. For test refunds, set RAZORPAY_REFUNDS_ENABLED=true and RAZORPAY_MODE=test in server/.env, then restart the backend. Live refunds require separate explicit authorization.',
    code:'NX_REFUNDS_DISABLED',
    configuration:refundConfiguration(),
  });
  let order;
  try{
    const pre=await pool.query('SELECT * FROM cod_orders WHERE id=$1',[id]);order=pre.rows[0];
    if(!order)return res.status(404).json({message:'Order not found.'});
    if(!eligibleForFullRefund(order))return res.status(409).json({message:'Only captured online orders in Placed or Confirmed status without an existing refund can be refunded.'});
    const payment=await fetchGatewayPayment(order.razorpay_payment_id);
    if(!paymentValidForOrder(payment,order))return res.status(409).json({message:'Razorpay payment not eligible for a full refund. Review payment in Dashboard.'});
    const db=await pool.connect();let open=false;
    try{
      await db.query('BEGIN');open=true;
      const locked=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[id]);
      if(!eligibleForFullRefund(locked.rows[0])||locked.rows[0].razorpay_payment_id!==payment.id){await rollback(db);open=false;return res.status(409).json({message:'Order/payment changed. No refund requested.'});}
      const key=`nx_order_${id}_full_refund_v1`;
      const changed=await db.query(`UPDATE cod_orders SET status='refund_pending',refund_status='requested',
        refund_request_key=$2,refund_reason=$3,refund_requested_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING *`,[id,key,reason.trim()]);
      const customerRequest=await db.query(`UPDATE order_cancellation_requests SET status='approved',
        reviewed_at=NOW(),reviewed_by=$2,admin_response='Approved: full Razorpay refund initiated.'
        WHERE order_id=$1 AND status='pending' RETURNING order_id`,[id,req.user.id]);
      if(customerRequest.rows.length)await addEvent(db,id,req.user.id,'cancellation_approved','Administrator approved cancellation subject to Razorpay refund processing.');
      await addEvent(db,id,req.user.id,'refund_requested',`Administrator requested a full Razorpay refund. Reason: ${reason.trim()}`);
      await db.query('COMMIT');open=false;order=changed.rows[0];
    }finally{if(open)await rollback(db);db.release();}
    let gatewayRefund;
    try{
      gatewayRefund=await createGatewayRefund(order.razorpay_payment_id,totalPaise(order),order.refund_request_key,order.refund_request_key);
    }catch(e){
      // Local intent intentionally persists. The provider might have processed a timed-out request.
      console.error('Refund API outcome uncertain:',e);
      return res.status(202).json({order:publicRefund(order),message:'Refund request saved, but Razorpay response is uncertain. Use Check refund status; do NOT request another refund.'});
    }
    if(!refundMatchesOrder(gatewayRefund,order)||!isRefundStatus(gatewayRefund.status))
      return res.status(202).json({order:publicRefund(order),message:'Razorpay response needs manual reconciliation. Do not start another refund.'});
    const applied=await applyInTransaction(id,gatewayRefund,req.user.id);
    if(applied.error)return res.status(202).json({order:publicRefund(order),message:'Refund accepted but reconciliation requires attention.'});
    return res.json({order:publicRefund(applied.order),message:applied.processed?'Refund processed and order cancelled.':'Refund requested. Awaiting Razorpay processing.'});
  }catch(e){return respondError(res,e);}
}
export async function reconcileFullRefund(req,res){
  const id=req.params.id;
  if(!validOrderId(id))return res.status(400).json({message:'Invalid order ID.'});
  try{
    const row=await pool.query('SELECT * FROM cod_orders WHERE id=$1',[id]);const order=row.rows[0];
    if(!order)return res.status(404).json({message:'Order not found.'});
    if(order.payment_method!=='razorpay'||!order.refund_request_key)return res.status(409).json({message:'No approved refund on this order.'});
    if(order.refund_status==='processed')return res.json({order:publicRefund(order),alreadyProcessed:true});
    const refunds=await fetchGatewayRefunds(order.razorpay_payment_id);
    if(!Array.isArray(refunds.items))return res.status(503).json({message:'Razorpay refund listing unavailable; manual review required.'});
    const matches=refunds.items.filter(r=>refundMatchesOrder(r,order));
    if(matches.length!==1)return res.status(202).json({order:publicRefund(order),message:matches.length>1?'Multiple matching refunds: manual review required.':'Refund not yet visible in Razorpay. Check Dashboard before any retry.'});
    const applied=await applyInTransaction(id,matches[0],req.user.id);
    if(applied.error)return res.status(409).json({message:applied.error});
    return res.json({order:publicRefund(applied.order)});
  }catch(e){return respondError(res,e);}
}
// Signed webhook calls this to reconcile a refund; unmatched events are returned as errors
// so the webhook delivery is retried instead of mistakenly acknowledged.
export async function processRefundWebhook(db,refund){
  if(!validGatewayIdentifier(refund?.id,'rfnd')||!validGatewayIdentifier(refund?.payment_id,'pay'))return {error:'Malformed refund notification.'};
  const found=await db.query('SELECT * FROM cod_orders WHERE razorpay_payment_id=$1 AND refund_request_key IS NOT NULL FOR UPDATE',[refund.payment_id]);
  const order=found.rows[0];
  if(!order)return {error:'Refund is not yet linked to a Nexora order.'};
  return applyGatewayRefund(db,order,refund);
}
