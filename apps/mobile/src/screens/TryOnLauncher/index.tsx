import type {TryOnCategory} from '@visioncart/contracts';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {tryOnSdk, type TryOnConfig} from '@visioncart/tryon-sdk';
import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';
import {assetsApi, catalogApi, tryonApi} from '../../api_services';
import {getTryOnCategory, getTryOnModel} from '../../assets';
import {Button} from '../../components';
import {COLORS, SIZES} from '../../constants';
import {environment} from '../../config/environment';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore, useGuestStore} from '../../store';

type Props = NativeStackScreenProps<RootStackParamList, 'TryOnLauncher'>;

type Phase = 'preparing' | 'active' | 'done' | 'error';

const DEFAULT_DIMENSIONS: Record<
  TryOnCategory,
  {widthMm: number; heightMm: number; depthMm: number}
> = {
  glasses: {widthMm: 140, heightMm: 45, depthMm: 145},
  watch: {widthMm: 42, heightMm: 42, depthMm: 12},
  ring: {widthMm: 20, heightMm: 20, depthMm: 8},
  earring: {widthMm: 12, heightMm: 30, depthMm: 8},
  nose_pin: {widthMm: 6, heightMm: 6, depthMm: 4},
};

function padChecksum(value: string): string {
  if (value.length >= 64) {
    return value.slice(0, 64);
  }
  return value.padEnd(64, '0');
}

export function TryOnLauncher({navigation, route}: Props) {
  const {productId} = route.params;
  const accessToken = useAuthStore(state => state.accessToken);
  const guestKey = useGuestStore(state => state.guestKey);
  const [phase, setPhase] = useState<Phase>('preparing');
  const [message, setMessage] = useState('Preparing your try-on session…');

  const runTryOn = useCallback(async () => {
    setPhase('preparing');
    setMessage('Preparing your try-on session…');

    try {
      const [product, resolved] = await Promise.all([
        catalogApi.getProduct(productId),
        assetsApi.resolve(productId),
      ]);

      const category =
        getTryOnCategory(product.tryon_model_key) ??
        getTryOnCategory(resolved.category);
      const asset = getTryOnModel(product.tryon_model_key);

      if (!category) {
        setPhase('error');
        setMessage('This product is not available for try-on.');
        return;
      }

      const capability = await tryOnSdk.isSupported(category);
      if (!capability.supported) {
        setPhase('error');
        setMessage(capability.reason ?? 'Try-on is not supported on this device.');
        return;
      }

      const bundledUri =
        asset !== undefined ? Image.resolveAssetSource(asset)?.uri ?? '' : '';
      const platformAssetUri =
        resolved.uri.startsWith('bundled://') || !resolved.uri
          ? bundledUri
          : resolved.uri;

      if (!platformAssetUri) {
        setPhase('error');
        setMessage('Try-on asset is not available for this product.');
        return;
      }

      const defaults = DEFAULT_DIMENSIONS[category];
      const sessionId = `tryon-${productId}-${Date.now()}`;
      const config: TryOnConfig = {
        sessionId,
        productId: String(productId),
        variantId: resolved.version || 'default',
        category,
        platformAssetUri,
        assetChecksum: padChecksum(resolved.checksum_sha256 || 'dev'),
        dimensions: {
          widthMm: resolved.width_mm || defaults.widthMm,
          heightMm: resolved.height_mm || defaults.heightMm,
          depthMm: resolved.depth_mm || defaults.depthMm,
        },
        anchorProfile: {
          version: '1.0.0',
          rootNode: resolved.root_node || 'root',
          defaultScale: resolved.default_scale || 1,
          adjustmentLimits: {
            minScale: 0.8,
            maxScale: 1.2,
            maxOffsetMm: 20,
            maxRotationDegrees: 15,
          },
        },
        captureEnabled: true,
      };

      setPhase('active');
      setMessage('Try-on session is open.');

      const result = await tryOnSdk.open(config);

      try {
        await tryonApi.recordSession({
          session_key: sessionId.slice(0, 64),
          product_id: product.id,
          category,
          outcome: result.outcome,
          duration_ms: result.durationMs,
          engine: capability.engine ?? '',
          error_code: result.errorCode ?? null,
          guest_key: accessToken ? null : guestKey,
        });
      } catch {
        // Session recording is best-effort.
      }

      setPhase('done');
      setMessage(
        result.outcome === 'completed'
          ? 'Try-on complete.'
          : `Session ${result.outcome}.`,
      );
    } catch (error) {
      const detail =
        environment.enableDiagnostics && error instanceof Error
          ? `\n${error.message}`
          : '';
      setPhase('error');
      setMessage(`Try-on couldn't start on this device.${detail}`);
    }
  }, [productId, accessToken, guestKey]);

  useEffect(() => {
    runTryOn();
  }, [runTryOn]);

  const busy = phase === 'preparing' || phase === 'active';

  return (
    <View style={styles.container}>
      {busy ? (
        <ActivityIndicator color={COLORS.primary} size="large" />
      ) : (
        <View
          style={[
            styles.statusDot,
            phase === 'error' ? styles.statusError : styles.statusDone,
          ]}
        />
      )}
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {message}
      </Text>

      <View style={styles.actions}>
        {phase === 'error' ? (
          <Button label="Try again" onPress={runTryOn} variant="secondary" />
        ) : null}
        <Button
          label="Done"
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        />
      </View>
    </View>
  );
}

export default TryOnLauncher;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacing.xl,
    backgroundColor: COLORS.background,
    gap: SIZES.spacing.lg,
  },
  message: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusDone: {
    backgroundColor: COLORS.success,
  },
  statusError: {
    backgroundColor: COLORS.danger,
  },
  actions: {
    alignSelf: 'stretch',
    gap: SIZES.spacing.md,
  },
  doneButton: {
    marginTop: SIZES.spacing.sm,
  },
});
