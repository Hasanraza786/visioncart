export type UserRole = "customer" | "admin";
export type AuthProvider = "email" | "google" | "apple";

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export const TRYON_MODEL_KEYS = ["glasses", "ring", "watch", "earring", "nose_pin"] as const;
export type TryOnModelKey = (typeof TRYON_MODEL_KEYS)[number];

export interface UserOut {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  auth_provider: AuthProvider;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: UserOut;
  tokens: TokenPair;
}

export interface CategoryOut {
  id: number;
  slug: string;
  name: string;
  description: string;
}

export interface CategoryInput {
  slug: string;
  name: string;
  description: string;
}

export interface ProductOut {
  id: number;
  category_id: number;
  name: string;
  brand: string;
  color: string;
  description: string;
  price_cents: number;
  currency: string;
  tryon_model_key: string;
  preview_url: string;
  is_active: boolean;
}

export interface ProductInput {
  category_id: number;
  name: string;
  brand: string;
  color: string;
  description: string;
  price_cents: number;
  currency: string;
  tryon_model_key: string;
  preview_url: string;
  is_active: boolean;
}

export interface OrderItemOut {
  id: number;
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

export interface OrderOut {
  id: number;
  status: OrderStatus;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  payment_method: string;
  notes: string;
  ship_full_name: string;
  ship_line1: string;
  ship_line2: string;
  ship_city: string;
  ship_state: string;
  ship_postal_code: string;
  ship_country: string;
  ship_phone: string;
  created_at: string;
  items: OrderItemOut[];
}

export interface MessageResponse {
  message: string;
}
