/** Customer cancellations always require admin review; never automatically refund. */
export function canRequestCancellation(order) {
  if (!order || !['placed', 'confirmed'].includes(order.status) || order.refund_status) return false;
  if (order.payment_method === 'cod') return order.payment_status === 'cod_pending';
  if (order.payment_method === 'razorpay') return order.payment_status === 'razorpay_paid';
  return false;
}
export function isPendingCancellation(request) {
  return request?.status === 'pending';
}
export function cancellationReasonValid(reason) {
  return typeof reason === 'string' && reason.trim().length >= 10 && reason.trim().length <= 200;
}
