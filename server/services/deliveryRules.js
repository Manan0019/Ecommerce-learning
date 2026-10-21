export function eligibleForAssignment(order){
 return Boolean(order && ['confirmed','processing','shipped'].includes(order.status) &&
  (order.payment_method==='cod' || (order.payment_method==='razorpay' && order.payment_status==='razorpay_paid')));
}
export function canUpdateDelivery(order,assignment,next){
 if(!order || !assignment || order.status!=='shipped' || order.refund_status) return false;
 if(next==='out_for_delivery')return assignment.status==='assigned';
 if(next==='delivered')return assignment.status==='out_for_delivery';
 return false;
}
export const validId = value => /^[1-9]\d{0,17}$/.test(String(value));
export const validNewPassword = pass => typeof pass==='string' && pass.length>=12 && Buffer.byteLength(pass,'utf8')<=72;
