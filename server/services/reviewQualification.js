import {reviewEligible} from './storefrontEngagementRules.js';
// The same query is used to authorize the review form and the submission endpoint.
// It requires a completed assigned handover, verified OTP, and recorded payment.
export async function findReviewableOrder(pool,customerId,productId){
 const result=await pool.query(`SELECT o.id,o.status,o.payment_status,
      a.status AS delivery_status,otp.verified_at
    FROM cod_orders o JOIN cod_order_items i ON i.order_id=o.id
    JOIN delivery_assignments a ON a.order_id=o.id AND a.status='delivered'
    JOIN delivery_confirmation_otps otp ON otp.order_id=o.id AND otp.verified_at IS NOT NULL
    WHERE o.customer_id=$1 AND i.product_id=$2 AND o.status='delivered'
      AND o.payment_status IN ('razorpay_paid','cod_collected')
    ORDER BY o.delivered_at DESC NULLS LAST,o.id DESC LIMIT 1`,[customerId,productId]);
 const row=result.rows[0];return row && reviewEligible(row) && row.delivery_status==='delivered' && row.verified_at ? row:null;
}
