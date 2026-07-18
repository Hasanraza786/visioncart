/**
 * App assets and icons.
 *
 * Runtime try-on models are optimized ingest-draft GLBs. Full A0 packages
 * (metadata, anchors, license, USDZ placeholder) live under
 * `tooling/assets/packages/`.
 */
import type {TryOnCategory} from '@visioncart/contracts';

export const tryOnModels = {
  glasses: require('./models/glasses.glb'),
  ring: require('./models/ring.glb'),
  watch: require('./models/watch.glb'),
  earring: require('./models/earring.glb'),
  nosePin: require('./models/nose_pin.glb'),
} as const;

export type TryOnModelKey = keyof typeof tryOnModels;

/**
 * Map a product's `tryon_model_key` (as stored by the API, e.g. "nose_pin")
 * to the bundled GLB asset key (e.g. "nosePin").
 */
const MODEL_KEY_TO_ASSET: Record<string, TryOnModelKey> = {
  glasses: 'glasses',
  ring: 'ring',
  watch: 'watch',
  earring: 'earring',
  nose_pin: 'nosePin',
  nosePin: 'nosePin',
};

/**
 * Map a product's `tryon_model_key` to the native try-on SDK category
 * (the SDK uses the underscore form "nose_pin").
 */
const MODEL_KEY_TO_CATEGORY: Record<string, TryOnCategory> = {
  glasses: 'glasses',
  ring: 'ring',
  watch: 'watch',
  earring: 'earring',
  nose_pin: 'nose_pin',
  nosePin: 'nose_pin',
};

export function getTryOnModel(modelKey: string): number | undefined {
  const assetKey = MODEL_KEY_TO_ASSET[modelKey];
  return assetKey ? tryOnModels[assetKey] : undefined;
}

export function getTryOnCategory(
  modelKey: string,
): TryOnCategory | undefined {
  return MODEL_KEY_TO_CATEGORY[modelKey];
}
