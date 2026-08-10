import { supabase } from '../db/supabaseClient';
import { API_URL } from '../lib/env';

/**
 * Gets a guaranteed fresh access token.
 * - Calls refreshSession() to proactively refresh if the token is near expiry.
 * - Falls back to the cached session if refresh fails (e.g., offline).
 */
async function getFreshToken(): Promise<string | null> {
  // refreshSession() hits the Supabase server and updates the local session
  // with a new access_token if the current one has expired or is near expiry.
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session) {
    console.warn('[apiClient] Token refresh failed, falling back to cached session:', error?.message);
    // Fallback: use cached session (may still be valid if refresh had a transient error)
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  return data.session.access_token;
}

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getFreshToken();

  const apiUrl = API_URL;

  const buildHeaders = (t: string | null) => ({
    'Content-Type': 'application/json',
    ...(t ? { 'Authorization': `Bearer ${t}` } : {}),
    ...options.headers,
  });

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: buildHeaders(token),
  });

  // --- 401 Retry Guard ---
  // If the backend still returns 401 (edge case: token expired between refresh and request),
  // force another refresh and retry ONCE before throwing.
  if (response.status === 401) {
    console.warn('[apiClient] Received 401 — forcing session refresh and retrying once...');
    const { data: refreshData } = await supabase.auth.refreshSession();
    const retryToken = refreshData.session?.access_token ?? null;

    if (!retryToken) {
      // Refresh failed entirely — user must re-login
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Session expired. Please log in again.');
    }

    const retryResponse = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: buildHeaders(retryToken),
    });

    if (!retryResponse.ok) {
      const errorData = await retryResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${retryResponse.status}: ${retryResponse.statusText}`);
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};
