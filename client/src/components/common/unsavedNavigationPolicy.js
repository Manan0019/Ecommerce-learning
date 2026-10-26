/** Authentication credentials are ephemeral and must never become an unsaved draft. */
const AUTH_ROUTES = new Set([
  '/login', '/admin/login', '/delivery/login',
  '/signup', '/verify-otp', '/forgot-password', '/reset-password',
]);

export function isAuthenticationRoute(pathname = '') {
  return AUTH_ROUTES.has(pathname.replace(/\/$/, '') || '/');
}

export function shouldBlockUnsavedNavigation({ dirty = false, currentLocation, nextLocation }) {
  if (!dirty || !currentLocation || !nextLocation) return false;
  // Login, logout and authentication redirects cannot be blocked by stale edits.
  if (isAuthenticationRoute(currentLocation.pathname) || isAuthenticationRoute(nextLocation.pathname)) return false;
  return currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search;
}
