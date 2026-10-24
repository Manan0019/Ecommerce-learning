import pool from '../config/db.js';
import {expirePendingReservation} from '../controllers/razorpayController.js';
let running=false;
export async function sweepPendingPayments({limit=25,log=console}={}){
 if(running)return {skipped:true};running=true;
 const summary={checked:0,expired:0,held:0,errors:0};
 try{
  const rows=await pool.query(`SELECT id FROM cod_orders WHERE payment_method='razorpay' AND status='payment_pending'
   AND payment_status='razorpay_pending' AND placed_at<NOW()-INTERVAL '60 minutes'
   ORDER BY placed_at,id LIMIT $1`,[Math.min(100,Math.max(1,limit))]);
  for(const order of rows.rows){
   summary.checked++;
   try {const result=await expirePendingReservation(String(order.id),null);
    if(result.status===200)summary.expired++;else summary.held++;}
   catch(error){summary.errors++;log.error('Payment reservation retained after failed provider verification:',String(order.id),error?.message);}
  }
  return summary;
 }finally{running=false;}
}
export function startPaymentSweeper({log=console}={}){
 if(process.env.PAYMENT_SWEEP_ENABLED==='0')return ()=>{};
 const scan=async()=>{try{const result=await sweepPendingPayments({log});if(result.expired||result.errors)log.info('Payment reservation sweep',result);}catch(error){log.error('Payment sweep failed without releasing stock',error);}};
 const timer=setInterval(scan,5*60*1000);timer.unref?.();
 setImmediate(scan);return ()=>clearInterval(timer);
}
