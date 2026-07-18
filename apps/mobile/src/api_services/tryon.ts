import {apiRequest} from './client';
import type {RecentlyTried, TryOnSession, TryOnSessionCreate} from './types';

export function recordSession(
  payload: TryOnSessionCreate,
): Promise<TryOnSession> {
  return apiRequest<TryOnSession>('/tryon/sessions', {
    method: 'POST',
    body: payload,
  });
}

export function listRecent(guestKey?: string | null): Promise<RecentlyTried[]> {
  const params = new URLSearchParams();
  if (guestKey) {
    params.set('guest_key', guestKey);
  }
  const qs = params.toString();
  return apiRequest<RecentlyTried[]>(`/tryon/recent${qs ? `?${qs}` : ''}`);
}
