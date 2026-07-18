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
  seller_url: string;
  is_active: boolean;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
};

export type AssetPlatform = 'ios' | 'android' | 'shared';
export type AssetStatus =
  | 'development'
  | 'technical_review'
  | 'device_qa'
  | 'approved'
  | 'published'
  | 'deprecated';

export type AssetResolveOut = {
  product_id: number;
  platform: AssetPlatform;
  version: string;
  status: AssetStatus;
  uri: string;
  checksum_sha256: string;
  content_type: string;
  byte_size: number;
  root_node: string;
  default_scale: number;
  anchor_json: string;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  category: string;
  development: boolean;
};

export type Favorite = {
  product: Product;
  created_at: string;
};

export type GuestCreateResponse = {
  guest_key: string;
};

export type GuestMergeRequest = {
  guest_key: string;
  idempotency_key: string;
};

export type TryOnSessionCreate = {
  session_key: string;
  product_id: number;
  category: string;
  outcome: string;
  duration_ms?: number;
  engine?: string;
  device_tier?: string;
  error_code?: string | null;
  guest_key?: string | null;
};

export type TryOnSession = {
  id: number;
  session_key: string;
  product_id: number;
  category: string;
  outcome: string;
  duration_ms: number;
  created_at: string;
};

export type RecentlyTried = {
  product: Product;
  last_tried_at: string;
  outcome: string;
};

export type MessageResponse = {
  message: string;
};

export type AccountDeleteResponse = {
  message: string;
  deleted: boolean;
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
