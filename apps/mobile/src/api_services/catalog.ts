import {apiRequest} from './client';
import type {Category, Product} from './types';

export function listCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/categories', {auth: false});
}

export type ProductQuery = {
  categorySlug?: string | undefined;
  search?: string | undefined;
};

export function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.categorySlug) {
    params.set('category_slug', query.categorySlug);
  }
  if (query.search) {
    params.set('search', query.search);
  }
  const qs = params.toString();
  return apiRequest<Product[]>(`/products${qs ? `?${qs}` : ''}`, {auth: false});
}

export function getProduct(productId: number): Promise<Product> {
  return apiRequest<Product>(`/products/${productId}`, {auth: false});
}
