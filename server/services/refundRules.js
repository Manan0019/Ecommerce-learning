import { validGatewayIdentifier, razorpaySettings } from './razorpayService.js';

// Refund operations must be explicitly enabled; LIVE additionally needs a separate opt-in.
export function refundWritesEnabled(env = process.env, settings = razorpaySettings()) {
  return settings.enabled && env.RAZORPAY_REFUNDS_ENABLED === 'true' &&
    (settings.mode === 'test' || (settings.mode === 'live' && env.RAZORPAY_LIVE_REFUNDS_ENABLED === 'true'));
}
export function eligibleForFullRefund(order) {
  return order?.payment_method === 'razorpay' && order.payment_status === 'razorpay_paid' &&
    ['placed','confirmed'].includes(order.status) && !order.refund_status &&
    validGatewayIdentifier(order.razorpay_payment_id,'pay');
}
export function totalPaise(order) {
  const value=String(order?.grand_total??'');
  if (!/^\d{1,10}\.\d{2}$/.test(value)) return null;
  const amount=Number(value.replace('.',''));
  return Number.isSafeInteger(amount)&&amount>0?amount:null;
}
export function refundMatchesOrder(refund,order) {
  if(!order||!refund||!validGatewayIdentifier(refund.id,'rfnd'))return false;
  const paise=totalPaise(order);
  if(!paise || refund.amount!==paise || refund.currency!=='INR' || refund.payment_id!==order.razorpay_payment_id)return false;
  // Once we know the provider refund ID, never accept a different refund via receipt alone.
  if (order.razorpay_refund_id) return refund.id === order.razorpay_refund_id;
  return Boolean(order.refund_request_key && (refund.receipt === order.refund_request_key || refund.notes?.order === order.refund_request_key));
}
export function isRefundStatus(value) {
  return ['pending','processed','failed','created'].includes(value);
}

// Read-only diagnostics; never expose API keys, secrets, or private payment data.
export function refundConfiguration(env = process.env, settings = razorpaySettings()) {
  const enabled = refundWritesEnabled(env, settings);
  const reason = !settings.enabled ? 'razorpay_unconfigured'
    : env.RAZORPAY_REFUNDS_ENABLED !== 'true' ? 'refund_opt_in_missing'
    : settings.mode === 'live' && env.RAZORPAY_LIVE_REFUNDS_ENABLED !== 'true' ? 'live_refund_opt_in_missing'
    : null;
  return { enabled, mode: settings.mode, reason };
}
