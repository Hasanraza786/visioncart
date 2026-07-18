import {tryOnSdk} from '@visioncart/tryon-sdk';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {environment} from '../../config/environment';
import {useFoundationStore} from '../../store';
import {styles} from './styles';

export function Foundation() {
  const [tryOnStatus, setTryOnStatus] = useState('Not started');
  const hasCompletedBoot = useFoundationStore(
    state => state.hasCompletedBoot,
  );

  const openPlaceholder = async () => {
    setTryOnStatus('Checking support');

    try {
      const capability = await tryOnSdk.isSupported('glasses');
      if (!capability.supported) {
        setTryOnStatus(capability.reason ?? 'Unsupported');
        return;
      }

      setTryOnStatus('Session open');
      const result = await tryOnSdk.open({
        sessionId: `foundation-${Date.now()}`,
        productId: 'synthetic-glasses',
        variantId: 'default',
        category: 'glasses',
        platformAssetUri: 'fixture://synthetic-glasses',
        assetChecksum: '0'.repeat(64),
        dimensions: {
          widthMm: 140,
          heightMm: 45,
          depthMm: 145,
        },
        anchorProfile: {
          version: '1.0.0',
          rootNode: 'frame_root',
          defaultScale: 1,
          adjustmentLimits: {
            minScale: 0.8,
            maxScale: 1.2,
            maxOffsetMm: 20,
            maxRotationDegrees: 15,
          },
        },
        captureEnabled: false,
      });
      setTryOnStatus(`Closed: ${result.outcome}`);
    } catch (error) {
      const detail =
        environment.enableDiagnostics && error instanceof Error
          ? `: ${error.message}`
          : '';
      setTryOnStatus(`Native session failed${detail}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Mobile foundation
      </Text>
      <Text style={styles.body}>
        Navigation, server state, and app state are connected.
      </Text>
      <View
        accessibilityLabel="Foundation status"
        accessibilityRole="summary"
        style={styles.status}>
        <Text style={styles.label}>Environment</Text>
        <Text style={styles.value}>{environment.name}</Text>
        <Text style={styles.label}>Boot status</Text>
        <Text style={styles.value}>
          {hasCompletedBoot ? 'Complete' : 'Pending'}
        </Text>
        <Text style={styles.label}>Try-on SDK</Text>
        <Text accessibilityLiveRegion="polite" style={styles.value}>
          {tryOnStatus}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={openPlaceholder}
        style={styles.button}>
        <Text style={styles.buttonLabel}>Open native placeholder</Text>
      </Pressable>
    </View>
  );
}

export default Foundation;
