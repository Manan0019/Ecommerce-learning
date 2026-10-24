import pool from '../config/db.js';
export async function getAnalyticsOverview(req,res){
 const days=Number(req.query.days)===7?7:Number(req.query.days)===90?90:30;
 try{
  const [overview,trend,products]=await Promise.all([
   pool.query(`SELECT COUNT(*)::int AS orders,COUNT(*) FILTER(WHERE status='delivered')::int AS delivered,
    COUNT(*) FILTER(WHERE status IN ('placed','confirmed','processing','shipped'))::int AS active,
    COUNT(*) FILTER(WHERE payment_method='cod' AND payment_status='cod_collected')::int AS cod_paid,
    COUNT(*) FILTER(WHERE payment_method='razorpay' AND payment_status='razorpay_paid')::int AS prepaid_paid,
    COALESCE(SUM(grand_total) FILTER(WHERE payment_status IN ('cod_collected','razorpay_paid')),0)::numeric(14,2) AS recorded_sales,
    COALESCE(SUM(grand_total) FILTER(WHERE payment_status='cod_collected'),0)::numeric(14,2) AS cod_collected,
    COALESCE(SUM(grand_total) FILTER(WHERE payment_status='razorpay_paid'),0)::numeric(14,2) AS prepaid_captured
    FROM cod_orders WHERE placed_at>NOW()-($1::int * INTERVAL '1 day')`,[days]),
   pool.query(`SELECT TO_CHAR((placed_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS day,
    COUNT(*)::int AS placed,
    COUNT(*) FILTER(WHERE payment_status IN ('cod_collected','razorpay_paid'))::int AS paid_orders,
    COALESCE(SUM(grand_total) FILTER(WHERE payment_status IN ('cod_collected','razorpay_paid')),0)::numeric(14,2) AS collected
    FROM cod_orders WHERE placed_at>NOW()-($1::int * INTERVAL '1 day') GROUP BY day ORDER BY day`,[days]),
   pool.query(`SELECT i.product_id,i.name_snapshot AS name,COALESCE(SUM(i.quantity),0)::int AS units,
    COALESCE(SUM(i.line_total),0)::numeric(14,2) AS line_value
    FROM cod_order_items i JOIN cod_orders o ON o.id=i.order_id
    WHERE o.placed_at>NOW()-($1::int * INTERVAL '1 day') AND o.payment_status IN ('cod_collected','razorpay_paid')
    GROUP BY i.product_id,i.name_snapshot ORDER BY units DESC LIMIT 8`,[days])
  ]);
  return res.json({days,overview:overview.rows[0],daily:trend.rows,products:products.rows});
 }catch(e){console.error('Admin analytics',e);return res.status(503).json({message:'Store analytics are temporarily unavailable.'});}
}
