/** Pure guards shared by login and delivery session checks. */
export function deliveryAccessDecision(role, isActive) {
  if (role !== 'delivery') return { ok: false, status: 403, message: 'Use a delivery executive account to access the delivery workspace.' };
  if (!isActive) return { ok: false, status: 403, message: 'This delivery account is disabled. Contact the administrator.' };
  return { ok: true, status: 200, message: null };
}
