/**
 * API service layer for the VisionCart commerce MVP.
 * Thin fetch wrapper (client) + typed endpoint modules + react-query hooks.
 */
import * as assetsApi from './assets';
import * as authApi from './auth';
import * as cartApi from './cart';
import * as catalogApi from './catalog';
import * as favoritesApi from './favorites';
import * as guestsApi from './guests';
import * as ordersApi from './orders';
import * as tryonApi from './tryon';

export {apiRequest, ApiError} from './client';
export * from './types';
export {
  authApi,
  cartApi,
  catalogApi,
  ordersApi,
  favoritesApi,
  guestsApi,
  tryonApi,
  assetsApi,
};
export {
  SOCIAL_AUTH_CONFIGURED,
  signInWithApple,
  signInWithGoogle,
} from './social-auth';
export * from './hooks';
