import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation} from '@tanstack/react-query';
import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import {ApiError, authApi, type AuthResponse} from '../../api_services';
import {Button, TextField} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function Register({navigation}: Props) {
  const setSession = useAuthStore(state => state.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({email: email.trim(), password, name: name.trim()}),
    onSuccess: (auth: AuthResponse) => {
      setSession(auth);
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to create your account right now.',
      );
    },
  });

  const submit = () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>
          Join VisionCart to try on and shop.
        </Text>

        <TextField
          autoCapitalize="words"
          label="Full name"
          onChangeText={setName}
          placeholder="Alex Doe"
          value={name}
        />
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
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Create account"
          loading={registerMutation.isPending}
          onPress={submit}
          style={styles.primary}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          style={styles.footerLink}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.footerAccent}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default Register;

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
