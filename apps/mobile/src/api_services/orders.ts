import {apiRequest} from './client';
import type {Order, ShippingAddress} from './types';

export type CreateOrderPayload = {
  shipping: ShippingAddress;
  notes?: string | null;
};

export function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return apiRequest<Order>('/orders', {method: 'POST', body: payload});
}

export function listOrders(): Promise<Order[]> {
  return apiRequest<Order[]>('/orders');
}

export function getOrder(orderId: number): Promise<Order> {
  return apiRequest<Order>(`/orders/${orderId}`);
}
