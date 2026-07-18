import {apiRequest} from './client';
import type {AuthResponse, TokenPair, User} from './types';

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    auth: false,
    body: {id_token: idToken},
  });
}

export function loginWithApple(
  identityToken: string,
  fullName?: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/apple', {
    method: 'POST',
    auth: false,
    body: {identity_token: identityToken, full_name: fullName ?? null},
  });
}

export function refresh(refreshToken: string): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/refresh', {
    method: 'POST',
    auth: false,
    body: {refresh_token: refreshToken},
  });
}

export function getMe(): Promise<User> {
  return apiRequest<User>('/auth/me');
}
