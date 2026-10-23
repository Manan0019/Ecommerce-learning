/** Presentation-only state. The server enforces all delivery permissions and transitions. */
export function deliveryTabMatch(assignment, tab) {
  if (tab === 'all') return true;
  if (tab === 'active') return assignment.deliveryStatus !== 'delivered';
  if (tab === 'ready') return assignment.deliveryStatus === 'assigned';
  if (tab === 'route') return assignment.deliveryStatus === 'out_for_delivery';
  if (tab === 'delivered') return assignment.deliveryStatus === 'delivered';
  return false;
}
export function deliveryNextAction(assignment) {
  if (assignment.orderStatus !== 'shipped') return null;
  if (assignment.deliveryStatus === 'assigned') return {status:'out_for_delivery', label:'Start delivery'};
  if (assignment.deliveryStatus === 'out_for_delivery') return {status:'delivered', label:'Confirm delivered'};
  return null;
}
export function mapSearchUrl(address) {
  const parts = [address?.addressLine1, address?.addressLine2, address?.city, address?.state, address?.pincode].filter(Boolean);
  return parts.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}` : '';
}
export function cleanPhone(value) {
  const phone = String(value || '').replace(/[^+0-9]/g, '');
  return /^\+?\d{8,15}$/.test(phone) ? phone : '';
}

/** Visual ordering only. Server remains the authority for delivery actions. */
export function deliveryAttentionPriority(assignment) {
  if (assignment.pendingIssue) return 2;
  if (assignment.deliveryStatus === 'out_for_delivery') return 0;
  if (assignment.deliveryStatus === 'assigned') return 1;
  if (assignment.deliveryStatus === 'delivered') return 3;
  return 2;
}
