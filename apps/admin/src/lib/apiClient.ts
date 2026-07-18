import { API_BASE_URL } from "@/lib/config";
import { clearSession, getAccessToken, getRefreshToken, saveTokens } from "@/lib/authStorage";
import type {
  AuthResponse,
  CategoryInput,
  CategoryOut,
  MessageResponse,
  OrderOut,
  OrderStatus,
  ProductInput,
  ProductOut,
  TokenPair,
} from "@/types/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class AuthExpiredError extends ApiError {
  constructor() {
    super("Your session has expired. Please sign in again.", 401);
    this.name = "AuthExpiredError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const first = data.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  } catch {
    // response had no JSON body
  }
  return `Request failed with status ${response.status}`;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) return null;

  const tokens = (await response.json()) as TokenPair;
  saveTokens(tokens);
  return tokens.access_token;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const doFetch = async (accessToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);

    return fetch(`${API_BASE_URL}${path}`, init);
  };

  let response = await doFetch(auth ? getAccessToken() : null);

  if (auth && response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      clearSession();
      throw new AuthExpiredError();
    }
    response = await doFetch(newAccessToken);
    if (response.status === 401) {
      clearSession();
      throw new AuthExpiredError();
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false });
}

export function fetchCategories(): Promise<CategoryOut[]> {
  return request<CategoryOut[]>("/categories", { auth: false });
}

export function createCategory(payload: CategoryInput): Promise<CategoryOut> {
  return request<CategoryOut>("/admin/categories", { method: "POST", body: payload });
}

export function updateCategory(id: number, payload: Partial<CategoryInput>): Promise<CategoryOut> {
  return request<CategoryOut>(`/admin/categories/${id}`, { method: "PATCH", body: payload });
}

export function deleteCategory(id: number): Promise<MessageResponse> {
  return request<MessageResponse>(`/admin/categories/${id}`, { method: "DELETE" });
}

export function fetchProducts(): Promise<ProductOut[]> {
  return request<ProductOut[]>("/products", { auth: false });
}

export function createProduct(payload: ProductInput): Promise<ProductOut> {
  return request<ProductOut>("/admin/products", { method: "POST", body: payload });
}

export function updateProduct(id: number, payload: Partial<ProductInput>): Promise<ProductOut> {
  return request<ProductOut>(`/admin/products/${id}`, { method: "PATCH", body: payload });
}

export function deleteProduct(id: number): Promise<MessageResponse> {
  return request<MessageResponse>(`/admin/products/${id}`, { method: "DELETE" });
}

export function fetchOrders(): Promise<OrderOut[]> {
  return request<OrderOut[]>("/admin/orders");
}

export function updateOrderStatus(id: number, status: OrderStatus): Promise<OrderOut> {
  return request<OrderOut>(`/admin/orders/${id}`, { method: "PATCH", body: { status } });
}
