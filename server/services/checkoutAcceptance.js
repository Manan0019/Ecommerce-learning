import { toPaise } from './cartPricing.js';

// A customer must approve the EXACT server-calculated quote (not an untrusted
// client-calculated price) before the transaction commits. This is a consent
// check, not a payment authorization or a reservation of inventory.
export const QUOTE_MONEY_FIELDS = Object.freeze([
  'subtotal', 'shippingFee', 'total', 'taxableValue',
  'includedTax', 'cgst', 'sgst', 'igst',
]);

export function acceptedQuoteError(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Review your checkout estimate before placing an order.';
  if (!['CGST + SGST', 'IGST'].includes(value.taxType)) return 'Invalid checkout tax breakdown. Refresh the estimate.';
  for (const field of QUOTE_MONEY_FIELDS) {
    try {
      const amount=toPaise(value[field]);
      if (amount < 0n || amount > 999999999999n) return 'Invalid checkout estimate. Refresh and try again.';
    } catch {
      return 'Invalid checkout estimate. Refresh and try again.';
    }
  }
  return null;
}

export function quoteSummary(amounts) {
  return Object.fromEntries([
    ...QUOTE_MONEY_FIELDS.map(field => [field, amounts[field]]),
    ['taxType', amounts.taxType],
  ]);
}

export function quoteMatchesAccepted(amounts, expected) {
  if (acceptedQuoteError(expected)) return false;
  return expected.taxType === amounts.taxType && QUOTE_MONEY_FIELDS.every(field => {
    try { return toPaise(amounts[field]) === toPaise(expected[field]); }
    catch { return false; }
  });
}
