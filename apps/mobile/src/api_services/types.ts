/**
 * Wire types mirroring the VisionCart FastAPI schemas
 * (apps/api/src/visioncart_api/schemas.py).
 */

export type UserRole = 'customer' | 'admin';
export type AuthProviderName = 'email' | 'google' | 'apple';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type User = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  auth_provider: AuthProviderName;
  created_at: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type AuthResponse = {
  user: User;
  tokens: TokenPair;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export type Product = {
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
};

export type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  product: Product;
  line_total_cents: number;
};

export type Cart = {
  id: number;
  items: CartItem[];
  subtotal_cents: number;
  currency: string;
};

export type ShippingAddress = {
  full_name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  phone: string;
};

export type OrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

export type Order = {
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
  items: OrderItem[];
};
