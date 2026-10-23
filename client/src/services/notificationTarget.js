// Match order identity from a notification's text or business event key.
// Use an explicit order query for deep links, never a guessed customer ID.
export function notificationDestination(item) {
  const base = typeof item?.path === 'string' && item.path.startsWith('/') && !item.path.startsWith('//')
    ? item.path : '/';
  if (!['/orders', '/admin/orders'].includes(base.split('?')[0])) return base;
  const body = [item.message, item.title, item.event_key].filter(Boolean).join(' ');
  const id = body.match(/\border\s*#\s*([1-9]\d*)\b/i)?.[1] || body.match(/\border:([1-9]\d*)\b/i)?.[1];
  return id ? `${base.split('?')[0]}?order=${encodeURIComponent(id)}` : base;
}
export function notificationKind(kind) {
  return ['order','delivery','cancellation','refund','inventory','payment'].includes(kind) ? kind : 'general';
}
