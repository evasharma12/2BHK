/**
 * Build return path (pathname + search + hash) for post-login redirect.
 * @param {import('react-router-dom').Location | { pathname?: string, search?: string, hash?: string }} location
 */
export function getReturnPath(location) {
  if (!location) return '/';
  const pathname = location.pathname || '/';
  const search = location.search || '';
  const hash = location.hash || '';
  const path = `${pathname}${search}${hash}`;
  return path || '/';
}

/**
 * Only allow same-origin relative paths to prevent open redirects.
 * @param {string | null | undefined} raw
 */
export function safeRedirectTarget(raw) {
  if (raw == null || typeof raw !== 'string') return '/';
  const t = raw.trim();
  if (!t) return '/';
  if (/^https?:\/\//i.test(t) || t.startsWith('//')) return '/';
  if (!t.startsWith('/')) return '/';
  return t;
}

/**
 * Login URL with encoded redirect back to the current route.
 * @param {import('react-router-dom').Location} location
 */
export function loginPathWithRedirect(location) {
  const safe = safeRedirectTarget(getReturnPath(location));
  if (safe === '/') return '/login';
  return `/login?redirect=${encodeURIComponent(safe)}`;
}
