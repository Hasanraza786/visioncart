import {apiRequest} from './client';
import type {
  AccountDeleteResponse,
  GuestCreateResponse,
  GuestMergeRequest,
  MessageResponse,
} from './types';

export function createGuest(): Promise<GuestCreateResponse> {
  return apiRequest<GuestCreateResponse>('/guests', {
    method: 'POST',
    auth: false,
  });
}

export function mergeGuest(
  payload: GuestMergeRequest,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/guests/merge', {
    method: 'POST',
    body: payload,
  });
}

export function deleteAccount(): Promise<AccountDeleteResponse> {
  return apiRequest<AccountDeleteResponse>('/account', {
    method: 'DELETE',
  });
}
