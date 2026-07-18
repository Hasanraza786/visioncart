import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation} from '@tanstack/react-query';
import {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  authApi,
  signInWithApple,
  signInWithGoogle,
  type AuthResponse,
} from '../../api_services';
import {Button, TextField} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store';
import {mergeGuestAfterAuth} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function Login({navigation}: Props) {
  const setSession = useAuthStore(state => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const goToApp = async (auth: AuthResponse) => {
    setSession(auth);
    await mergeGuestAfterAuth();
    navigation.reset({index: 0, routes: [{name: 'Main'}]});
  };

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({email: email.trim(), password}),
    onSuccess: goToApp,
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError ? err.message : 'Unable to sign in right now.',
      );
    },
  });

  const socialMutation = useMutation({
    mutationFn: (provider: 'google' | 'apple') =>
      provider === 'google' ? signInWithGoogle() : signInWithApple(),
    onSuccess: goToApp,
    onError: (err: unknown) => {
      Alert.alert(
        'Sign-in unavailable',
        err instanceof Error ? err.message : 'Please try again.',
      );
    },
  });

  const submit = () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to continue shopping.</Text>

        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <TextField
          autoCapitalize="none"
          label="Password"
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          value={password}
        />

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          label="Sign in"
          loading={loginMutation.isPending}
          onPress={submit}
          style={styles.primary}
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <Button
          label="Continue with Google"
          onPress={() => socialMutation.mutate('google')}
          variant="ghost"
        />
        {Platform.OS === 'ios' ? (
          <Button
            label="Continue with Apple"
            onPress={() => socialMutation.mutate('apple')}
            style={styles.appleButton}
            variant="ghost"
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Register')}
          style={styles.footerLink}>
          <Text style={styles.footerText}>
            New here? <Text style={styles.footerAccent}>Create an account</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default Login;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.spacing.lg,
  },
  heading: {
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
  subheading: {
    marginTop: SIZES.spacing.xs,
    marginBottom: SIZES.spacing.lg,
    color: COLORS.textMuted,
    fontSize: SIZES.body,
  },
  primary: {
    marginTop: SIZES.spacing.sm,
  },
  error: {
    marginBottom: SIZES.spacing.sm,
    color: COLORS.danger,
    fontSize: SIZES.label,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.spacing.lg,
    gap: SIZES.spacing.sm,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
  appleButton: {
    marginTop: SIZES.spacing.sm,
  },
  footerLink: {
    marginTop: SIZES.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
  },
  footerAccent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
