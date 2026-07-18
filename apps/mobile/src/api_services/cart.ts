import {apiRequest} from './client';
import type {Cart} from './types';

export function getCart(): Promise<Cart> {
  return apiRequest<Cart>('/cart');
}

export function addCartItem(
  productId: number,
  quantity = 1,
): Promise<Cart> {
  return apiRequest<Cart>('/cart/items', {
    method: 'POST',
    body: {product_id: productId, quantity},
  });
}

export function updateCartItem(
  itemId: number,
  quantity: number,
): Promise<Cart> {
  return apiRequest<Cart>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: {quantity},
  });
}

export function removeCartItem(itemId: number): Promise<Cart> {
  return apiRequest<Cart>(`/cart/items/${itemId}`, {method: 'DELETE'});
}
