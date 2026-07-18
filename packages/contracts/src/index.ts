export const CONTRACT_VERSION = '0.1.0' as const;
export const ASSET_SCHEMA_VERSION = '1.0.0' as const;

export type TryOnCategory =
  | 'glasses'
  | 'watch'
  | 'ring'
  | 'earring'
  | 'nose_pin';

export type TryOnOutcome =
  | 'completed'
  | 'cancelled'
  | 'unsupported'
  | 'failed';

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

export interface ProductDimensions {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly depthMm: number;
}

export interface AdjustmentLimits {
  readonly minScale: number;
  readonly maxScale: number;
  readonly maxOffsetMm: number;
  readonly maxRotationDegrees: number;
}

export interface AnchorProfile {
  readonly version: string;
  readonly rootNode: string;
  readonly defaultScale: number;
  readonly adjustmentLimits: AdjustmentLimits;
}

export type AssetCategory = TryOnCategory;
export type AssetPackageStatus =
  | 'synthetic-draft'
  | 'ingest-draft'
  | 'production-candidate';
export type AssetFileRole = 'model-gltf' | 'model-usdz' | 'preview';

export interface AssetDimensionsMm {
  width: number;
  height: number;
  depth: number;
}

export interface AssetProduct {
  schemaVersion: typeof ASSET_SCHEMA_VERSION;
  productId: string;
  name: string;
  category: AssetCategory;
  dimensionsMm: AssetDimensionsMm;
  synthetic: boolean;
  sourceNote?: string;
}

export interface AssetAnchor {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
}

export interface AssetAnchors {
  schemaVersion: typeof ASSET_SCHEMA_VERSION;
  coordinateSystem: 'right-handed-y-up';
  units: 'meters';
  anchors: AssetAnchor[];
}

export interface AssetLicense {
  schemaVersion: typeof ASSET_SCHEMA_VERSION;
  spdxId: string;
  copyright: string;
  source: string;
  synthetic: boolean;
  restrictions?: string[];
}

export interface AssetFile {
  path: string;
  mediaType: string;
  sha256: string;
  bytes: number;
  role: AssetFileRole;
  placeholder: boolean;
}

export interface AssetPackageMetadata {
  schemaVersion: typeof ASSET_SCHEMA_VERSION;
  packageId: string;
  category: AssetCategory;
  phase: 'A0';
  status: AssetPackageStatus;
  product: 'product.json';
  anchors: 'anchors.json';
  license: 'license.json';
  files: AssetFile[];
}
