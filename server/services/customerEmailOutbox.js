import pool from '../config/db.js';
import {sendOrderNotificationEmail} from '../config/mailer.js';
const ALLOWED=new Set(['order_placed','payment_verified','order_shipped','order_delivered','order_cancelled','refund_processed']);
export async function queueOrderEmail(db,orderId,kind){
 if(!ALLOWED.has(kind))throw new Error('Unsupported order email event');
 await db.query('INSERT INTO customer_email_outbox(order_id,kind) VALUES($1,$2) ON CONFLICT (order_id,kind) DO NOTHING',[orderId,kind]);
}
let working=false;
export async function processCustomerEmailOutbox({batch=10,log=console}={}){
 if(working)return {skipped:true};if(!process.env.SMTP_USER||!process.env.SMTP_PASSWORD)return {disabled:true};
 working=true;const totals={sent:0,failed:0};
 try{
  // Claim under brief PostgreSQL statement-level locks, then release before SMTP.
  const claimed=await pool.query(`WITH pick AS (
   SELECT id FROM customer_email_outbox WHERE (state='pending' AND next_attempt_at<=NOW())
   OR (state='sending' AND claimed_at < NOW()-INTERVAL '10 minutes')
   ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED
  ) UPDATE customer_email_outbox o SET state='sending',claimed_at=NOW(),attempts=attempts+1
   FROM pick WHERE o.id=pick.id RETURNING o.*`,[Math.min(30,Math.max(1,batch))]);
  for(const item of claimed.rows){
   try{
    const r=await pool.query(`SELECT o.id,o.grand_total,o.payment_method,o.status,u.email,u.full_name
     FROM cod_orders o JOIN users u ON u.id=o.customer_id WHERE o.id=$1`,[item.order_id]);
    if(!r.rows.length)throw new Error('Order not found');
    await sendOrderNotificationEmail(r.rows[0].email,{kind:item.kind,orderId:String(item.order_id),amount:r.rows[0].grand_total,name:r.rows[0].full_name});
    await pool.query("UPDATE customer_email_outbox SET state='sent',sent_at=NOW(),claimed_at=NULL,last_error=NULL WHERE id=$1",[item.id]);totals.sent++;
   }catch(error){totals.failed++;log.error('Customer order email failed',String(item.id),error?.message);
    const retry=item.attempts>=6?'failed':'pending';
    await pool.query(`UPDATE customer_email_outbox SET state=$2,claimed_at=NULL,last_error=$3,
      next_attempt_at=NOW() + make_interval(secs => power(2,LEAST($4,8))::int * 60) WHERE id=$1`,[item.id,retry,String(error?.message||'Mail provider unavailable').slice(0,300),item.attempts]);
   }
  }
  return totals;
 }finally{working=false;}
}
export function startCustomerEmailOutbox(){
 if(process.env.CUSTOMER_EMAIL_WORKER_ENABLED==='0')return ()=>{};
 const check=()=>processCustomerEmailOutbox().catch(e=>console.error('Customer email outbox query failed',e));
 const interval=setInterval(check,60*1000);interval.unref?.();setImmediate(check);return ()=>clearInterval(interval);
}
