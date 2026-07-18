import {Platform} from 'react-native';
import {apiRequest} from './client';
import type {AssetPlatform, AssetResolveOut} from './types';

export function currentPlatform(): AssetPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function resolve(
  productId: number,
  platform: AssetPlatform = currentPlatform(),
): Promise<AssetResolveOut> {
  return apiRequest<AssetResolveOut>(
    `/assets/resolve/${productId}?platform=${platform}`,
    {auth: false},
  );
}
