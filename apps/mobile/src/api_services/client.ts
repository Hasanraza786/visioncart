import {environment} from '../config/environment';
import {useAuthStore} from '../store/auth-store';
import type {TokenPair} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the access token as a Bearer header. Defaults to true. */
  auth?: boolean;
  /** Attempt a refresh + retry once on 401. Defaults to true. */
  retryOnUnauthorized?: boolean;
  signal?: AbortSignal;
};

function buildUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as {detail: unknown}).detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (first && typeof first === 'object' && 'msg' in first) {
        return String((first as {msg: unknown}).msg);
      }
    }
  }
  return `Request failed with status ${status}`;
}

/**
 * Exchange the stored refresh token for a new token pair. Returns the fresh
 * access token, or null when refresh is not possible (caller should log out).
 */
async function refreshAccessToken(): Promise<string | null> {
  const {refreshToken, setTokens, clearSession} = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({refresh_token: refreshToken}),
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const tokens = (await parseResponse(response)) as TokenPair;
    setTokens(tokens);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    retryOnUnauthorized = true,
    signal,
  } = options;

  const headers: Record<string, string> = {Accept: 'application/json'};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (
    response.status === 401 &&
    auth &&
    retryOnUnauthorized &&
    useAuthStore.getState().refreshToken
  ) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      return apiRequest<T>(path, {...options, retryOnUnauthorized: false});
    }
    useAuthStore.getState().clearSession();
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(response.status, data), data);
  }

  return data as T;
}
