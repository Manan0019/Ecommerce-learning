import { fromPaise, toPaise } from './cartPricing.js';
import { canonicalIndianState } from './indianStates.js';

// Checkout uses a store-configured tax mode. Historic orders remain unchanged.
// Always calculate on server integer paise, and obtain rates from verified product/policy data.
export function validPercent(value) {
  return /^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(String(value)) && Number(value) <= 40;
}
export function inclusiveTax(grossPaise, rate) {
  if (!validPercent(rate)) throw new Error('Invalid GST percentage');
  const bps = BigInt(Math.round(Number(rate) * 100));
  return (grossPaise * bps + (10000n + bps) / 2n) / (10000n + bps);
}
export function exclusiveTax(netPaise, rate) {
  if (!validPercent(rate)) throw new Error('Invalid GST percentage');
  const bps = BigInt(Math.round(Number(rate) * 100));
  return (netPaise * bps + 5000n) / 10000n;
}
export function calculateCheckout(lines, state, policy, coupon = null) {
  if (!Array.isArray(lines) || !lines.length || !state || typeof state !== 'string') throw new Error('Invalid checkout details');
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0n);
  const discounts=coupon?.allocations||lines.map(()=>0n);
  if(discounts.length!==lines.length||discounts.some((d,i)=>typeof d!=='bigint'||d<0n||d>lines[i].lineTotal))throw new Error('Invalid coupon allocations');
  const discountAmount=discounts.reduce((s,d)=>s+d,0n);
  if(discountAmount!== (coupon?.discountPaise||0n))throw new Error('Coupon allocation mismatch');
  const taxableProductSubtotal=subtotal-discountAmount;
  const destination = canonicalIndianState(state);
  const origin = canonicalIndianState(policy.origin_state);
  // Fail closed rather than misclassify unknown destinations as taxable intra-state.
  if (!destination || !origin) throw new Error('Choose a valid Indian delivery and dispatch state.');
  const inState = destination === origin;
  const threshold = toPaise(policy.free_shipping_above);
  const shipping = threshold > 0n && subtotal >= threshold ? 0n : toPaise(inState ? policy.shipping_fee_in_state : policy.shipping_fee_other_state);
  const mode = policy.tax_pricing_mode || 'inclusive';
  if (!['inclusive', 'exclusive'].includes(mode)) throw new Error('Invalid GST pricing mode');
  const taxFn = mode === 'exclusive' ? exclusiveTax : inclusiveTax;
  const itemTaxes = lines.map((line,i) => taxFn(line.lineTotal-discounts[i], line.gstPercent));
  const shippingTax = taxFn(shipping, policy.shipping_gst_percent);
  const includedTax = itemTaxes.reduce((a, b) => a + b, 0n) + shippingTax;
  const total = taxableProductSubtotal + shipping + (mode === 'exclusive' ? includedTax : 0n);
  if (total > 999999999999n) throw new Error('Checkout total exceeds allowed value');
  // Rounding: divide whole calculated GST into CGST and SGST, exact sum preserved.
  const cgst = inState ? includedTax / 2n : 0n;
  const sgst = inState ? includedTax - cgst : 0n;
  const igst = inState ? 0n : includedTax;
  return {
    subtotal: fromPaise(subtotal), discountAmount: fromPaise(discountAmount), couponCode:coupon?.code||null, shippingFee: fromPaise(shipping), total: fromPaise(total),
    taxableValue: fromPaise(mode === 'exclusive' ? taxableProductSubtotal + shipping : total - includedTax),
    includedTax: fromPaise(includedTax), taxPricingMode: mode,
    cgst: fromPaise(cgst), sgst: fromPaise(sgst), igst: fromPaise(igst),
    taxType: inState ? 'CGST + SGST' : 'IGST',
    shippingReason: threshold > 0n && subtotal >= threshold ? 'threshold' : 'regional',
    shippingRegion: inState ? 'within-state' : 'other-state',
    itemTaxes: itemTaxes.map(fromPaise),
    // Internal BigInt totals for guaranteed integer precision when writing order.
    _subtotal: subtotal, _discount: discountAmount, _shipping: shipping, _total: total,
  };
}
export function validateCheckoutSettings(data) {
  if (!data || typeof data !== 'object') return null;
  const origin = String(data.origin_state || '').trim();
  const canonicalOrigin = canonicalIndianState(origin);
  if (!canonicalOrigin) return null;
  for (const key of ['shipping_fee_in_state','shipping_fee_other_state','free_shipping_above']) {
    try { if (toPaise(data[key]) < 0n || toPaise(data[key]) > 1000000000n) return null; } catch { return null; }
  }
  if (!validPercent(data.shipping_gst_percent) || !validPercent(data.default_item_gst_percent) || typeof data.cod_enabled !== 'boolean' || !['inclusive','exclusive'].includes(data.tax_pricing_mode || 'inclusive')) return null;
  return {origin_state:canonicalOrigin,shipping_fee_in_state:String(data.shipping_fee_in_state),shipping_fee_other_state:String(data.shipping_fee_other_state),free_shipping_above:String(data.free_shipping_above),shipping_gst_percent:String(data.shipping_gst_percent),default_item_gst_percent:String(data.default_item_gst_percent),cod_enabled:data.cod_enabled,tax_pricing_mode:data.tax_pricing_mode||'inclusive'};
}
