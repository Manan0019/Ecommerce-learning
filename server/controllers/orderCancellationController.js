import pool from '../config/db.js';
import { notifyAdmins,notifyUser } from '../services/notificationService.js';
import { validOrderId } from '../services/codOrderRules.js';
import { canRequestCancellation, cancellationReasonValid } from '../services/cancellationRules.js';

function failure(res,err) {
  console.error('Cancellation request operation:',err);
  if (err.code === '42P01' || err.code === '42703') return res.status(503).json({message:'Migration 027 for customer cancellation requests is missing.'});
  return res.status(500).json({message:'Unable to process the cancellation request. Please try again.'});
}
export async function requestOrderCancellation(req,res) {
  const id=req.params.id, reason=req.body?.reason;
  if (!validOrderId(id) || !cancellationReasonValid(reason)) return res.status(400).json({message:'Enter a cancellation reason between 10 and 200 characters.'});
  const db=await pool.connect();let started=false;
  try {
    await db.query('BEGIN');started=true;
    const found=await db.query('SELECT * FROM cod_orders WHERE id=$1 AND customer_id=$2 FOR UPDATE',[id,req.user.id]);
    if(!found.rows.length){await db.query('ROLLBACK');started=false;return res.status(404).json({message:'Order not found.'});}
    const prior=await db.query('SELECT * FROM order_cancellation_requests WHERE order_id=$1',[id]);
    if(prior.rows.length){await db.query('COMMIT');started=false;return res.status(prior.rows[0].status==='pending'?200:409).json({message:prior.rows[0].status==='pending'?'Cancellation request already submitted.':'A cancellation request has already been reviewed for this order.',request:prior.rows[0]});}
    if(!canRequestCancellation(found.rows[0])){await db.query('ROLLBACK');started=false;return res.status(409).json({message:'Cancellation requests are available only before preparation for eligible COD or captured Razorpay orders.'});}
    const saved=await db.query(`INSERT INTO order_cancellation_requests(order_id,customer_id,reason)
      VALUES($1,$2,$3) RETURNING *`,[id,req.user.id,reason.trim()]);
    await db.query(`INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes)
      VALUES($1,'cancellation_requested',$2,'Customer requested cancellation; pending administrator review.')`,[id,req.user.id]);
    await notifyAdmins(db,{key:`order:${id}:cancel-request`,kind:'cancellation',title:'Cancellation requested',message:`Customer requests cancellation of order #${id}.`,path:'/admin/orders'});
    await db.query('COMMIT');started=false;
    return res.status(201).json({message:'Cancellation request sent. The store will review it before any cancellation or refund.',request:saved.rows[0]});
  }catch(err){if(started)await db.query('ROLLBACK').catch(()=>{});return failure(res,err);}finally{db.release();}
}
export async function declineCancellation(req,res) {
  const id=req.params.id,reason=req.body?.reason;
  if(!validOrderId(id)||!cancellationReasonValid(reason))return res.status(400).json({message:'Enter a review reason of 10–200 characters.'});
  const db=await pool.connect();let started=false;
  try{
    await db.query('BEGIN');started=true;
    const found=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[id]);
    if(!found.rows.length){await db.query('ROLLBACK');started=false;return res.status(404).json({message:'Order not found.'});}
    const request=await db.query('SELECT * FROM order_cancellation_requests WHERE order_id=$1 FOR UPDATE',[id]);
    if(request.rows[0]?.status!=='pending'){await db.query('ROLLBACK');started=false;return res.status(409).json({message:'There is no pending cancellation request to decline.'});}
    if(!canRequestCancellation(found.rows[0])){await db.query('ROLLBACK');started=false;return res.status(409).json({message:'Order state changed. Review the order before responding.'});}
    const saved=await db.query(`UPDATE order_cancellation_requests SET status='declined',reviewed_at=NOW(),reviewed_by=$2,
      admin_response=$3 WHERE order_id=$1 RETURNING *`,[id,req.user.id,reason.trim()]);
    await db.query(`INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'cancellation_declined',$2,$3)`,[id,req.user.id,reason.trim()]);
    await notifyUser(db,found.rows[0].customer_id,{key:`order:${id}:cancellation-declined`,kind:'cancellation',title:'Cancellation request reviewed',message:`Your cancellation request for order #${id} was declined.`,path:'/orders'});
    await db.query('COMMIT');started=false;return res.json({request:saved.rows[0]});
  }catch(err){if(started)await db.query('ROLLBACK').catch(()=>{});return failure(res,err);}finally{db.release();}
}
