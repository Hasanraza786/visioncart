import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../../components';
import {APP_NAME, APP_TAGLINE, COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function Welcome({navigation}: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VC</Text>
        </View>
        <Text accessibilityRole="header" style={styles.brand}>
          {APP_NAME}
        </Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        <Text style={styles.subcopy}>
          Preview glasses, watches, rings and more in real time, then check out
          in seconds.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Sign in" onPress={() => navigation.navigate('Login')} />
        <Button
          label="Create account"
          onPress={() => navigation.navigate('Register')}
          style={styles.secondaryButton}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}

export default Welcome;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.spacing.lg,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: SIZES.subheading,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brand: {
    color: COLORS.text,
    fontSize: SIZES.title,
    fontWeight: '800',
  },
  tagline: {
    marginTop: SIZES.spacing.sm,
    color: COLORS.primary,
    fontSize: SIZES.subheading,
    fontWeight: '700',
  },
  subcopy: {
    marginTop: SIZES.spacing.md,
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    lineHeight: 24,
  },
  actions: {
    gap: SIZES.spacing.md,
  },
  secondaryButton: {
    marginTop: SIZES.spacing.sm,
  },
});
