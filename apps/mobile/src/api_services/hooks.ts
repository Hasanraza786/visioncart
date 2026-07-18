import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {addCartItem, getCart, removeCartItem, updateCartItem} from './cart';
import {getProduct, listCategories, listProducts} from './catalog';
import {addFavorite, listFavorites, removeFavorite} from './favorites';
import {createOrder, listOrders, type CreateOrderPayload} from './orders';
import {listRecent} from './tryon';
import type {
  Cart,
  Category,
  Favorite,
  MessageResponse,
  Order,
  Product,
  RecentlyTried,
} from './types';

export const queryKeys = {
  categories: ['categories'] as const,
  products: (categorySlug?: string, search?: string) =>
    ['products', categorySlug ?? null, search ?? null] as const,
  product: (id: number) => ['product', id] as const,
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  favorites: ['favorites'] as const,
  recent: (guestKey?: string | null) =>
    ['recent', guestKey ?? 'auth'] as const,
};

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: listCategories,
    staleTime: 5 * 60_000,
  });
}

export function useProducts(
  categorySlug?: string,
  search?: string,
): UseQueryResult<Product[]> {
  return useQuery({
    queryKey: queryKeys.products(categorySlug, search),
    queryFn: () => listProducts({categorySlug, search}),
  });
}

export function useProduct(id: number): UseQueryResult<Product> {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => getProduct(id),
  });
}

export function useCart(enabled = true): UseQueryResult<Cart> {
  return useQuery({queryKey: queryKeys.cart, queryFn: getCart, enabled});
}

export function useAddToCart(): UseMutationResult<
  Cart,
  Error,
  {productId: number; quantity?: number}
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({productId, quantity}) => addCartItem(productId, quantity),
    onSuccess: cart => client.setQueryData(queryKeys.cart, cart),
  });
}

export function useUpdateCartItem(): UseMutationResult<
  Cart,
  Error,
  {itemId: number; quantity: number}
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({itemId, quantity}) => updateCartItem(itemId, quantity),
    onSuccess: cart => client.setQueryData(queryKeys.cart, cart),
  });
}

export function useRemoveCartItem(): UseMutationResult<Cart, Error, number> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => removeCartItem(itemId),
    onSuccess: cart => client.setQueryData(queryKeys.cart, cart),
  });
}

export function useOrders(enabled = true): UseQueryResult<Order[]> {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: listOrders,
    enabled,
  });
}

export function useCreateOrder(): UseMutationResult<
  Order,
  Error,
  CreateOrderPayload
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      client.setQueryData(queryKeys.cart, undefined);
      client.invalidateQueries({queryKey: queryKeys.cart});
      client.invalidateQueries({queryKey: queryKeys.orders});
    },
  });
}

export function useFavorites(enabled = true): UseQueryResult<Favorite[]> {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: listFavorites,
    enabled,
  });
}

export function useAddFavorite(): UseMutationResult<
  MessageResponse,
  Error,
  number
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => addFavorite(productId),
    onSuccess: () => {
      client.invalidateQueries({queryKey: queryKeys.favorites});
    },
  });
}

export function useRemoveFavorite(): UseMutationResult<
  MessageResponse,
  Error,
  number
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => removeFavorite(productId),
    onSuccess: () => {
      client.invalidateQueries({queryKey: queryKeys.favorites});
    },
  });
}

export function useRecentTried(
  guestKey?: string | null,
  enabled = true,
): UseQueryResult<RecentlyTried[]> {
  return useQuery({
    queryKey: queryKeys.recent(guestKey),
    queryFn: () => listRecent(guestKey),
    enabled,
  });
}
