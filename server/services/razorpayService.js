import { createHmac, timingSafeEqual } from 'node:crypto';

// Node 22's native fetch avoids storing or exposing payment provider credentials in the browser.
export function razorpaySettings() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  const mode = process.env.RAZORPAY_MODE?.trim() || 'test';
  const enabled = Boolean(keyId && keySecret && ['test','live'].includes(mode) && keyId.startsWith(`rzp_${mode}_`));
  return { enabled, keyId: enabled ? keyId : '', mode };
}
function secretKey() {
  if (!razorpaySettings().enabled) throw new Error('Razorpay is not correctly configured.');
  return process.env.RAZORPAY_KEY_SECRET.trim();
}
export async function razorpayApi(method, path, payload) {
  const key = razorpaySettings();
  if (!key.enabled || !/^\/(?:orders|payments)(?:\/[A-Za-z0-9_-]+)*(?:\/payments)?$/.test(path))
    throw new Error('Payment provider configuration or endpoint is invalid.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: `Basic ${Buffer.from(`${key.keyId}:${secretKey()}`).toString('base64')}`,
        'Content-Type': 'application/json' },
      ...(payload ? { body: JSON.stringify(payload) } : {}), signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error('Payment provider could not complete the request.');
      error.code = 'NX_RAZORPAY_API'; error.status = response.status;
      throw error;
    }
    return data;
  } finally { clearTimeout(timeout); }
}
export const createGatewayOrder = payload => razorpayApi('POST','/orders',payload);
export const fetchGatewayPayment = paymentId => razorpayApi('GET',`/payments/${paymentId}`);
export const fetchGatewayOrder = gatewayId => razorpayApi('GET',`/orders/${gatewayId}`);
export const fetchGatewayOrderPayments = gatewayId => razorpayApi('GET',`/orders/${gatewayId}/payments`);
function matchingHmac(input, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256',secret).update(input).digest();
  return timingSafeEqual(expected, Buffer.from(signature,'hex'));
}
export function verifyCheckoutSignature(storedOrderId, paymentId, signature, secret = secretKey()) {
  return typeof storedOrderId === 'string' && typeof paymentId === 'string' &&
    matchingHmac(`${storedOrderId}|${paymentId}`,signature,secret);
}
export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  return Buffer.isBuffer(rawBody) && typeof secret === 'string' && secret.length >= 16 &&
    matchingHmac(rawBody,signature,secret);
}
export function capturedPaymentMatches(payment, order) {
  if (!payment || !order || payment.status !== 'captured' || payment.captured !== true) return false;
  if (!/^pay_[A-Za-z0-9]+$/.test(String(payment.id))) return false;
  if (payment.order_id !== order.razorpay_order_id || payment.currency !== 'INR') return false;
  const expected = Number(String(order.grand_total).replace('.',''));
  // Enforce numeric 2-decimal precision rather than trusting any customer input.
  if (!/^\d+\.\d{2}$/.test(String(order.grand_total))) return false;
  return Number.isSafeInteger(payment.amount) && payment.amount === expected;
}
export function validGatewayIdentifier(input, prefix) {
  return typeof input === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9]{5,80}$`).test(input);
}
