/**
 * API service layer for the VisionCart commerce MVP.
 * Thin fetch wrapper (client) + typed endpoint modules + react-query hooks.
 */
import * as authApi from './auth';
import * as cartApi from './cart';
import * as catalogApi from './catalog';
import * as ordersApi from './orders';

export {apiRequest, ApiError} from './client';
export * from './types';
export {authApi, cartApi, catalogApi, ordersApi};
export {
  SOCIAL_AUTH_CONFIGURED,
  signInWithApple,
  signInWithGoogle,
} from './social-auth';
export * from './hooks';
