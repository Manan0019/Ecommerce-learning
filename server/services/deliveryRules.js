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

// Record delivery exceptions without cancelling an order or changing payment state.
export const deliveryIssueKinds = ['failed_attempt','reschedule_requested'];
export function validateDeliveryIssue(body) {
 if(!body || !deliveryIssueKinds.includes(body.kind)) return 'Choose a valid delivery issue.';
 if(typeof body.reason!=='string' || body.reason.trim().length<10 || body.reason.trim().length>300) return 'Explain the delivery issue in 10–300 characters.';
 if(body.kind==='reschedule_requested') {
  if(typeof body.requestedDate!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.requestedDate)) return 'Choose a valid proposed delivery date.';
  const day=new Date(`${body.requestedDate}T00:00:00Z`);
  const now=new Date();const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==body.requestedDate || day<today || day>new Date(today.getTime()+30*86400000))return 'Proposed delivery date must be within the next 30 days.';
 }else if(body.requestedDate!=null && body.requestedDate!=='')return 'Only rescheduling requests accept a proposed date.';
 return null;
}
export function canReportDeliveryIssue(order,assignment,pendingIssue){
 return Boolean(order?.status==='shipped' && !order.refund_status && assignment?.status==='out_for_delivery' && !pendingIssue);
}
