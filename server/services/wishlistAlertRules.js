/** Pure transition rules: product-wide alerts, never alerts on first observation. */
export function wishlistTransitions(previous, current) {
  if (previous.alert_available == null || previous.alert_sale == null || previous.alert_price == null) return [];
  if (!current.is_active || !current.category_active) return [];
  const events = [];
  if (current.available && !previous.alert_available && current.back_in_stock) events.push('stock');
  if (current.available && Number(current.current_price)<Number(previous.alert_price)-0.001 && current.price_drop) events.push('price');
  if (current.available && current.on_sale && !previous.alert_sale && current.sale_start) events.push('sale');
  return events;
}
