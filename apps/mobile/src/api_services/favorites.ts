import {apiRequest} from './client';
import type {Favorite, MessageResponse} from './types';

export function listFavorites(): Promise<Favorite[]> {
  return apiRequest<Favorite[]>('/favorites');
}

export function addFavorite(productId: number): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/favorites/${productId}`, {
    method: 'POST',
  });
}

export function removeFavorite(productId: number): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/favorites/${productId}`, {
    method: 'DELETE',
  });
}
