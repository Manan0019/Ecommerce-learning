import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
export const DELIVERY_OTP_LIFETIME_MS = 10 * 60 * 1000;
export const DELIVERY_OTP_COOLDOWN_MS = 60 * 1000;
export function otpEnabled(env = process.env) {
  return typeof env.DELIVERY_OTP_SECRET === 'string' && env.DELIVERY_OTP_SECRET.length >= 32 &&
    Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
}
export function issueDeliveryCode(secret, orderId) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('DELIVERY_OTP_NOT_CONFIGURED');
  const code = String(randomInt(0,1_000_000)).padStart(6,'0');
  const salt = randomBytes(16).toString('hex');
  return {code, salt, hash: codeDigest(code, salt, orderId, secret)};
}
export function codeDigest(code, salt, orderId, secret) {
  return createHmac('sha256',secret).update(`${orderId}:${salt}:${code}`).digest('hex');
}
export function verifyDeliveryCode(code, salt, orderId, secret, storedHash) {
  if (!/^\d{6}$/.test(code || '') || !/^[a-f0-9]{64}$/.test(storedHash || '') ||
      !/^[a-f0-9]{32}$/.test(salt || '') || typeof secret !== 'string' || secret.length < 32) return false;
  const actual = Buffer.from(codeDigest(code,salt,orderId,secret),'hex');
  return timingSafeEqual(actual, Buffer.from(storedHash,'hex'));
}
export function otpRequestAllowed(row, now=Date.now()) {
  if (!row) return {ok:true,count:1,windowAt:new Date(now)};
  const last = new Date(row.sent_at).getTime();
  const windowAt = new Date(row.send_window_at).getTime();
  if (now - last < DELIVERY_OTP_COOLDOWN_MS) return {ok:false,reason:'Please wait at least 60 seconds before requesting another delivery code.'};
  const count = now-windowAt>=60*60*1000 ? 1 : Number(row.send_count)+1;
  if (count>5) return {ok:false,reason:'Hourly delivery-code limit reached. Try again later.'};
  return {ok:true,count,windowAt:new Date(count===1?now:windowAt)};
}
export function maskedEmail(email) {
  const [name,domain] = String(email||'').split('@');
  if (!name || !domain) return 'Customer email unavailable';
  return `${name[0]}***@${domain}`;
}
