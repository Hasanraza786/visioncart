import type {
  AdjustmentLimits,
  AnchorProfile,
  ProductDimensions,
  TryOnCategory,
  TryOnErrorCode,
  TryOnOutcome,
} from '@visioncart/contracts';
import NativeVisionCartTryOn from './NativeVisionCartTryOn';

export interface CapabilityResult {
  readonly supported: boolean;
  readonly category: TryOnCategory;
  readonly engine?: string;
  readonly reason?: string;
}

export interface TryOnConfig {
  readonly sessionId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly category: TryOnCategory;
  readonly platformAssetUri: string;
  readonly assetChecksum: string;
  readonly dimensions: ProductDimensions;
  readonly anchorProfile: AnchorProfile;
  readonly captureEnabled: boolean;
}

export interface TryOnResult {
  readonly sessionId: string;
  readonly outcome: TryOnOutcome;
  readonly durationMs: number;
  readonly captureUri?: string;
  readonly errorCode?: TryOnErrorCode;
}

export interface VisionCartTryOnSdk {
  isSupported(category: TryOnCategory): Promise<CapabilityResult>;
  open(config: TryOnConfig): Promise<TryOnResult>;
  clearCache(): Promise<void>;
}

const VisionCartTryOn: VisionCartTryOnSdk = NativeVisionCartTryOn;

export const tryOnSdk = VisionCartTryOn;
export default VisionCartTryOn;

export type {AdjustmentLimits, AnchorProfile, ProductDimensions};
