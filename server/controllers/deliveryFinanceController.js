import pool from '../config/db.js';
import {parseFinanceWindow,financeSummary,rupees} from '../services/deliveryFinanceRules.js';
import {validId} from '../services/deliveryRules.js';

const safe=(res,e)=>{console.error('Finance report failed',e);return res.status(500).json({message:'Could not load delivery finance records.'});};
function filters(req,res){
 const window=parseFinanceWindow(req.query);
 if(window.error){res.status(400).json({message:window.error});return null;}
 return window;
}
function rowsMap(rows){return rows.map(r=>({orderId:String(r.order_id),executiveId:String(r.executive_id),executiveName:r.executive_name,
  deliveryStatus:r.delivery_status,deliveredAt:r.delivered_at,assignedAt:r.assigned_at,total:r.grand_total,
  payRatePaise:Number(r.pay_rate_paise),payRate:rupees(r.pay_rate_paise),paidAt:r.earnings_paid_at,
  paymentMethod:r.payment_method,paymentStatus:r.payment_status,refundStatus:r.refund_status||null}));}
async function loadEarnings(db,{from,to,executiveId=null}){
 const params=[from,to,executiveId];
 const where=`($1::date IS NULL OR COALESCE(a.delivered_at,a.assigned_at) >= ($1::timestamp AT TIME ZONE 'Asia/Kolkata'))
   AND ($2::date IS NULL OR COALESCE(a.delivered_at,a.assigned_at) < (($2::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Kolkata'))
   AND ($3::bigint IS NULL OR a.executive_id=$3)`;
 const result=await db.query(`SELECT a.order_id,a.executive_id,u.full_name AS executive_name,a.status AS delivery_status,
 a.assigned_at,a.delivered_at,a.pay_rate_paise,o.grand_total,o.payment_method,o.payment_status,o.refund_status,
 p.paid_at AS earnings_paid_at
 FROM delivery_assignments a JOIN cod_orders o ON o.id=a.order_id JOIN users u ON u.id=a.executive_id
 LEFT JOIN delivery_earnings_payouts p ON p.order_id=a.order_id
 WHERE ${where}
 ORDER BY COALESCE(a.delivered_at,a.assigned_at) DESC,a.order_id DESC LIMIT 2000`,params);
 const records=rowsMap(result.rows);
 const totals=await db.query(`SELECT COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE a.status='delivered' AND a.delivered_at IS NOT NULL)::int AS completed,
  COUNT(*) FILTER (WHERE a.status<>'delivered' OR a.delivered_at IS NULL)::int AS pending,
  COALESCE(SUM(a.pay_rate_paise) FILTER(WHERE a.status='delivered' AND a.delivered_at IS NOT NULL),0)::bigint AS earned,
  COALESCE(SUM(a.pay_rate_paise) FILTER(WHERE a.status='delivered' AND a.delivered_at IS NOT NULL AND p.paid_at IS NOT NULL),0)::bigint AS paid,
  COALESCE(SUM(a.pay_rate_paise) FILTER(WHERE a.status='delivered' AND a.delivered_at IS NOT NULL AND p.paid_at IS NULL),0)::bigint AS unpaid
  FROM delivery_assignments a LEFT JOIN delivery_earnings_payouts p ON p.order_id=a.order_id WHERE ${where}`,params);
 const t=totals.rows[0];
 const summary={...financeSummary(records),total:Number(t.total),completed:Number(t.completed),pending:Number(t.pending),earnedPaise:Number(t.earned),paidPaise:Number(t.paid),unpaidPaise:Number(t.unpaid)};
 return {rows:records,summary,limit:2000,limited:records.length===2000};
}
export async function getMyEarnings(req,res){
 const range=filters(req,res);if(!range)return;
 try{return res.json(await loadEarnings(pool,{...range,executiveId:req.user.id}));}catch(e){return safe(res,e);}
}
export async function getAdminEarnings(req,res){
 const range=filters(req,res);if(!range)return;
 const executiveId=req.query.executiveId||null;
 if(executiveId&&!validId(executiveId))return res.status(400).json({message:'Invalid executive filter.'});
 try{return res.json(await loadEarnings(pool,{...range,executiveId}));}catch(e){return safe(res,e);}
}
export async function recordEarningsPayout(req,res){
 const id=req.params.orderId;const ref=String(req.body?.reference||'').trim();
 if(!validId(id)||ref.length<3||ref.length>120)return res.status(400).json({message:'Provide a payout reference between 3 and 120 characters.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const found=await db.query(`SELECT a.order_id,a.executive_id,a.pay_rate_paise,a.status,a.delivered_at,
   otp.verified_at FROM delivery_assignments a LEFT JOIN delivery_confirmation_otps otp ON otp.order_id=a.order_id
   WHERE a.order_id=$1 FOR UPDATE OF a`,[id]);
  const row=found.rows[0];
  if(!row||row.status!=='delivered'||!row.delivered_at||!row.verified_at){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Only OTP-verified completed deliveries can receive payouts.'});}
  const already=await db.query('SELECT order_id FROM delivery_earnings_payouts WHERE order_id=$1',[id]);
  if(already.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Earnings payout already recorded for this order.'});}
  await db.query(`INSERT INTO delivery_earnings_payouts(order_id,executive_id,amount_paise,reference,paid_by)
   VALUES($1,$2,$3,$4,$5)`,[id,row.executive_id,row.pay_rate_paise,ref,req.user.id]);
  await db.query('COMMIT');open=false;
  return res.json({ok:true,message:'Executive payout recorded. This is separate from customer COD collection.'});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});return safe(res,e);}finally{db.release();}
}
/** Store receipts, not profit: sales are not free of cost of goods, taxes, shipping or refunds. */
export async function getAdminCollections(req,res){
 const range=filters(req,res);if(!range)return;
 try{
  const r=await pool.query(`SELECT
   COUNT(*)::int AS order_count,
   COALESCE(SUM(grand_total),0)::text AS gross_orders,
   COALESCE(SUM(grand_total) FILTER(WHERE payment_method='cod'),0)::text AS cod_orders,
   COALESCE(SUM(grand_total) FILTER(WHERE payment_method='cod' AND payment_status='cod_collected'),0)::text AS cod_collected,
   COALESCE(SUM(grand_total) FILTER(WHERE payment_method='cod' AND payment_status<>'cod_collected' AND status<>'cancelled'),0)::text AS cod_uncollected,
   COALESCE(SUM(grand_total) FILTER(WHERE payment_method='razorpay'),0)::text AS prepaid_orders,
   COALESCE(SUM(grand_total) FILTER(WHERE payment_method='razorpay' AND payment_status='razorpay_paid' AND refund_status IS NULL),0)::text AS prepaid_verified,
   COALESCE(SUM(grand_total) FILTER(WHERE refund_status='processed' OR payment_status='razorpay_refunded'),0)::text AS refunded_value
  FROM cod_orders WHERE ($1::date IS NULL OR placed_at >= ($1::timestamp AT TIME ZONE 'Asia/Kolkata'))
  AND ($2::date IS NULL OR placed_at < (($2::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Kolkata'))`,[range.from,range.to]);
  const detail=await pool.query(`SELECT id,placed_at,grand_total,payment_method,payment_status,refund_status,status,cod_collected_at,paid_at
    FROM cod_orders WHERE ($1::date IS NULL OR placed_at >= ($1::timestamp AT TIME ZONE 'Asia/Kolkata'))
    AND ($2::date IS NULL OR placed_at < (($2::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Kolkata')) ORDER BY placed_at DESC LIMIT 500`,[range.from,range.to]);
  return res.json({summary:r.rows[0],rows:detail.rows.map(o=>({id:String(o.id),placedAt:o.placed_at,total:o.grand_total,paymentMethod:o.payment_method,
   paymentStatus:o.payment_status,refundStatus:o.refund_status,status:o.status,paidAt:o.paid_at,codCollectedAt:o.cod_collected_at})),
   limit:500,limited:detail.rows.length===500,disclaimer:'Receipts and gross order value, NOT net profit. Refunds and delivery wages are shown separately.'});
 }catch(e){return safe(res,e);}
}
