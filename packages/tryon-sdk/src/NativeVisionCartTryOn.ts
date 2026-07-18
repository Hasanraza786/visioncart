import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type TryOnCategory =
  | 'glasses'
  | 'watch'
  | 'ring'
  | 'earring'
  | 'nose_pin';

export type TryOnErrorCode =
  | 'PERMISSION_DENIED'
  | 'PERMISSION_RESTRICTED'
  | 'DEVICE_UNSUPPORTED'
  | 'CATEGORY_UNSUPPORTED'
  | 'CAMERA_UNAVAILABLE'
  | 'ASSET_DOWNLOAD_FAILED'
  | 'ASSET_CHECKSUM_MISMATCH'
  | 'ASSET_FORMAT_UNSUPPORTED'
  | 'ASSET_METADATA_INVALID'
  | 'MODEL_LOAD_FAILED'
  | 'TRACKING_INITIALIZATION_FAILED'
  | 'TRACKING_LOST'
  | 'CAPTURE_FAILED'
  | 'SESSION_ALREADY_ACTIVE'
  | 'SESSION_INTERRUPTED'
  | 'THERMAL_LIMIT'
  | 'OUT_OF_MEMORY'
  | 'INTERNAL_ERROR';

export type CapabilityResult = {
  supported: boolean;
  category: TryOnCategory;
  engine?: string;
  reason?: string;
};

export type ProductDimensions = {
  widthMm: number;
  heightMm: number;
  depthMm: number;
};

export type AdjustmentLimits = {
  minScale: number;
  maxScale: number;
  maxOffsetMm: number;
  maxRotationDegrees: number;
};

export type AnchorProfile = {
  version: string;
  rootNode: string;
  defaultScale: number;
  adjustmentLimits: AdjustmentLimits;
};

export type TryOnConfig = {
  sessionId: string;
  productId: string;
  variantId: string;
  category: TryOnCategory;
  platformAssetUri: string;
  assetChecksum: string;
  dimensions: ProductDimensions;
  anchorProfile: AnchorProfile;
  captureEnabled: boolean;
};

export type TryOnResult = {
  sessionId: string;
  outcome: 'completed' | 'cancelled' | 'unsupported' | 'failed';
  durationMs: number;
  captureUri?: string;
  errorCode?: TryOnErrorCode;
};

export interface Spec extends TurboModule {
  isSupported(category: TryOnCategory): Promise<CapabilityResult>;
  open(config: TryOnConfig): Promise<TryOnResult>;
  clearCache(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('VisionCartTryOn');
