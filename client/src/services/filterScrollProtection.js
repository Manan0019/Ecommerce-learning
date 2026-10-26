/**
 * Keep filter/search actions at their current viewport position. React may
 * commit several renders (filtered results -> loading skeleton -> server data),
 * so a one-frame scrollTo is insufficient. This module is deliberately shared
 * by all workspaces; forms and regular links are not affected.
 */
const FILTER_REGIONS = [
  '.nx69-category-toolbar', '.nx69-product-filters', '.nx-table-toolbar',
  '.nx77-table-toolbar', '.nx-cod-toolbar', '.nx69-promotion-toolbar',
  '.nx60-orders-toolbar', '.nx81-finance-filters', '.nx52-delivery-work-top',
  '.nx32-active-filters', '.catalogue-results-bar', '.catalogue-filters',
  '.nx48-department-track', '.nx69-category-actions', '.nx-ui-filter-actions',
  '.nx71-featured-filters', '.nx74-customer-tools', '.nx86-staff-toolbar',
  '.nx61-review-moderation .nx77-table-toolbar'
].join(',');

let current = null;

function viewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight || 0;
}

/** Stop a pending filter adjustment when the shopper intentionally navigates. */
export function cancelFilterScrollPreservation() {
  current?.cancel();
}

export function beginFilterScrollPreservation() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.body || window.scrollY < 1) return;
  if (current) {
    current.extend();
    return;
  }

  const body = document.body;
  const documentStyle = document.documentElement.style;
  const previousOverflowAnchor = documentStyle.overflowAnchor;
  documentStyle.overflowAnchor = 'none';
  const priorMinHeight = body.style.minHeight;
  const position = { x: window.scrollX, y: window.scrollY };
  // A result set may shrink below the former scroll position. Keep the page
  // tall enough to avoid browser clamping while the asynchronous render settles.
  const requiredHeight = Math.max(document.documentElement.scrollHeight, position.y + viewportHeight() + 2);
  const computedMin = Number.parseFloat(getComputedStyle(body).minHeight) || 0;
  if (requiredHeight > computedMin) body.style.minHeight = `${Math.ceil(requiredHeight)}px`;
  const temporaryHeight = body.style.minHeight;

  let deadline = performance.now() + 1100;
  let frame = 0;
  let released = false;
  const restore = () => {
    if (!released && (Math.abs(window.scrollY - position.y) > 1 || Math.abs(window.scrollX - position.x) > 1)) {
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    }
  };
  const clear = () => {
    if (released) return;
    released = true;
    cancelAnimationFrame(frame);
    for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      window.removeEventListener(name, cancelOnNewInteraction, true);
    }
    // Only undo the temporary height that belongs to this filter interaction.
    if (body.style.minHeight === temporaryHeight) body.style.minHeight = priorMinHeight;
    if (documentStyle.overflowAnchor === 'none') documentStyle.overflowAnchor = previousOverflowAnchor;
    if (current === session) current = null;
  };
  const cancelOnNewInteraction = () => clear();
  const tick = (now) => {
    if (released) return;
    restore();
    if (now < deadline) {
      frame = requestAnimationFrame(tick);
      return;
    }
    frame = 0;
    // If the page has genuinely shrunk, retain the minimum height until the
    // next user interaction/navigation; otherwise it would snap to the top.
    const root = document.getElementById("root");
    const actualHeight = root ? root.scrollHeight : document.documentElement.scrollHeight;
    if (actualHeight > position.y + viewportHeight() + 2) {
      clear();
    }
  };
  const session = {
    extend() { deadline = performance.now() + 1100; if (!frame) frame = requestAnimationFrame(tick); },
    cancel: clear,
    restore
  };
  current = session;
  for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(name, cancelOnNewInteraction, true);
  }
  frame = requestAnimationFrame(tick);
  restore();
}

/** Capture native filter changes before React state updates or URL navigation. */
export function installFilterScrollProtection() {
  if (typeof document === 'undefined') return () => {};
  const capture = (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(FILTER_REGIONS)) return;
    if (event.type === 'click' && !target.closest('button,a,[role="button"]')) return;
    if (event.type === 'keydown' && !['Enter', ' ', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    beginFilterScrollPreservation();
  };
  for (const event of ['input', 'change', 'click', 'keydown']) document.addEventListener(event, capture, true);
  return () => {
    for (const event of ['input', 'change', 'click', 'keydown']) document.removeEventListener(event, capture, true);
    cancelFilterScrollPreservation();
  };
}
