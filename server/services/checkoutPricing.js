import { fromPaise, toPaise } from './cartPricing.js';

// This module never adds tax to a product selling price. Each quoted item price
// and the configured shipping fee are GST-INCLUSIVE. Rates require accountant review.
export function validPercent(value) {
  return /^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(String(value)) && Number(value) <= 40;
}
export function inclusiveTax(grossPaise, rate) {
  if (!validPercent(rate)) throw new Error('Invalid GST percentage');
  const bps = BigInt(Math.round(Number(rate) * 100));
  return (grossPaise * bps + (10000n + bps) / 2n) / (10000n + bps);
}
export function calculateCheckout(lines, state, policy) {
  if (!Array.isArray(lines) || !lines.length || !state || typeof state !== 'string') throw new Error('Invalid checkout details');
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0n);
  const inState = state.trim().toLocaleLowerCase('en-IN') === String(policy.origin_state).trim().toLocaleLowerCase('en-IN');
  const threshold = toPaise(policy.free_shipping_above);
  const shipping = threshold > 0n && subtotal >= threshold ? 0n : toPaise(inState ? policy.shipping_fee_in_state : policy.shipping_fee_other_state);
  const itemTaxes = lines.map(line => inclusiveTax(line.lineTotal, line.gstPercent));
  const shippingTax = inclusiveTax(shipping, policy.shipping_gst_percent);
  const includedTax = itemTaxes.reduce((a, b) => a + b, 0n) + shippingTax;
  const total = subtotal + shipping;
  // Rounding: divide whole included tax into CGST and SGST, exact sum preserved.
  const cgst = inState ? includedTax / 2n : 0n;
  const sgst = inState ? includedTax - cgst : 0n;
  const igst = inState ? 0n : includedTax;
  return {
    subtotal: fromPaise(subtotal), shippingFee: fromPaise(shipping), total: fromPaise(total),
    taxableValue: fromPaise(total - includedTax), includedTax: fromPaise(includedTax),
    cgst: fromPaise(cgst), sgst: fromPaise(sgst), igst: fromPaise(igst),
    taxType: inState ? 'CGST + SGST' : 'IGST',
    itemTaxes: itemTaxes.map(fromPaise),
    // Internal BigInt totals for guaranteed integer precision when writing order.
    _subtotal: subtotal, _shipping: shipping, _total: total,
  };
}
export function validateCheckoutSettings(data) {
  if (!data || typeof data !== 'object') return null;
  const origin = String(data.origin_state || '').trim();
  if (origin.length < 2 || origin.length > 100) return null;
  for (const key of ['shipping_fee_in_state','shipping_fee_other_state','free_shipping_above']) {
    try { if (toPaise(data[key]) < 0n || toPaise(data[key]) > 1000000000n) return null; } catch { return null; }
  }
  if (!validPercent(data.shipping_gst_percent) || !validPercent(data.default_item_gst_percent) || typeof data.cod_enabled !== 'boolean') return null;
  return {origin_state:origin,shipping_fee_in_state:String(data.shipping_fee_in_state),shipping_fee_other_state:String(data.shipping_fee_other_state),free_shipping_above:String(data.free_shipping_above),shipping_gst_percent:String(data.shipping_gst_percent),default_item_gst_percent:String(data.default_item_gst_percent),cod_enabled:data.cod_enabled};
}
