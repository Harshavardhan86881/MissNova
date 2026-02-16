/**
 * Authenticated fetch wrapper.
 * Reads the JWT access token from localStorage and attaches it
 * as a Bearer token on every request so the backend can identify the user.
 */

function getAccessToken() {
  try {
    const auth = localStorage.getItem('voice_tutor_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed.accessToken || null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Drop-in replacement for window.fetch that automatically adds
 * the Authorization header when a token is available.
 *
 * Usage:  import { authFetch } from '../utils/authFetch';
 *         const res = await authFetch('/api/stats');
 */
export async function authFetch(url, options = {}) {
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

export default authFetch;
