import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {tryOnSdk} from '@visioncart/tryon-sdk';
import {useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {guestsApi} from '../../api_services';
import {Button} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore, useGuestStore} from '../../store';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function Settings({navigation}: Props) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore(state => state.accessToken);
  const clearSession = useAuthStore(state => state.clearSession);
  const clearGuest = useGuestStore(state => state.clearGuest);
  const isSignedIn = Boolean(accessToken);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openCameraSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        'Unable to open settings',
        'Open your device Settings app and allow camera access for VisionCart.',
      );
    });
  };

  const clearTryOnCache = async () => {
    setCacheBusy(true);
    try {
      await tryOnSdk.clearCache();
      Alert.alert('Cache cleared', 'Try-on assets were removed from this device.');
    } catch {
      Alert.alert('Something went wrong', 'Could not clear the try-on cache.');
    } finally {
      setCacheBusy(false);
    }
  };

  const signOut = () => {
    clearSession();
    clearGuest();
    queryClient.clear();
    navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently anonymizes your account and removes favorites. Order history is retained in anonymized form.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            try {
              await guestsApi.deleteAccount();
              clearSession();
              clearGuest();
              queryClient.clear();
              navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
            } catch {
              Alert.alert(
                'Deletion failed',
                'Could not delete your account. Please try again.',
              );
            } finally {
              setDeleteBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}>
      <Text style={styles.sectionTitle}>Privacy</Text>
      <Text style={styles.body}>
        VisionCart runs try-on on your device. Camera frames, face or hand
        landmarks, and 3D meshes stay local — they are not uploaded. We store
        only product preferences, order details when you check out, and
        anonymous try-on session summaries (product and outcome).
      </Text>
      <Text style={styles.body}>
        Guest mode keeps a local guest key so recently tried items survive
        restarts. Signing in merges that history into your account.
      </Text>

      <Text style={styles.sectionTitle}>Camera</Text>
      <Text style={styles.body}>
        Try-on needs camera permission. If you denied access, open{' '}
        {Platform.OS === 'ios' ? 'Settings' : 'App info'} and enable the camera.
      </Text>
      <Button
        label="Open camera settings"
        onPress={openCameraSettings}
        style={styles.button}
        variant="secondary"
      />

      <Text style={styles.sectionTitle}>Storage</Text>
      <Button
        label="Clear try-on cache"
        loading={cacheBusy}
        onPress={clearTryOnCache}
        style={styles.button}
        variant="ghost"
      />

      <Text style={styles.sectionTitle}>Account</Text>
      {isSignedIn ? (
        <View style={styles.accountActions}>
          <Button label="Sign out" onPress={signOut} variant="ghost" />
          <Button
            label="Delete account"
            loading={deleteBusy}
            onPress={confirmDeleteAccount}
            style={styles.deleteButton}
            variant="ghost"
          />
        </View>
      ) : (
        <View style={styles.accountActions}>
          <Text style={styles.body}>
            You are browsing as a guest. Sign in to sync favorites and orders.
          </Text>
          <Button
            label="Sign in"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
          />
          <Button
            label="Leave guest session"
            onPress={signOut}
            variant="ghost"
          />
        </View>
      )}
    </ScrollView>
  );
}

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.spacing.lg,
    paddingBottom: SIZES.spacing.xl,
  },
  sectionTitle: {
    marginTop: SIZES.spacing.lg,
    marginBottom: SIZES.spacing.sm,
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '700',
  },
  body: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    lineHeight: 24,
    marginBottom: SIZES.spacing.sm,
  },
  button: {
    marginTop: SIZES.spacing.sm,
  },
  accountActions: {
    gap: SIZES.spacing.md,
    marginTop: SIZES.spacing.sm,
  },
  deleteButton: {
    borderColor: COLORS.danger,
  },
});
