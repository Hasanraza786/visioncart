import appleAuth, {
  AppleError,
  AppleRequestResponse,
} from '@invertase/react-native-apple-authentication';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {Platform} from 'react-native';
import type {AuthResponse} from './types';
import {loginWithApple, loginWithGoogle} from './auth';

/** Google Cloud OAuth clients for VisionCart (`com.visioncart`). */
const GOOGLE_WEB_CLIENT_ID =
  '250279750810-ju1f2567c7hhk563vq30lkdorrqrddgs.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID =
  '250279750810-ie9o1qmbvfli9jcef9egsj8p0gtvr7pk.apps.googleusercontent.com';

let googleConfigured = false;

function ensureGoogleConfigured(): void {
  if (googleConfigured) {
    return;
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export const SOCIAL_AUTH_CONFIGURED = true;

function mapAppleError(error: unknown): Error {
  if (error instanceof Error) {
    const code = (error as {code?: string}).code;
    if (code === AppleError.CANCELED) {
      return new Error('Apple sign-in was cancelled.');
    }
    if (code === AppleError.FAILED || code === AppleError.INVALID_RESPONSE) {
      return new Error(
        'Apple Sign-In failed. Enable “Sign in with Apple” for App ID com.visioncart on team 7K3NY3SR6K in Apple Developer, then reinstall the app.',
      );
    }
    if (code === AppleError.NOT_HANDLED || code === AppleError.UNKNOWN) {
      return new Error(
        'Apple Sign-In is not available. Check that the app was signed with the Sign in with Apple entitlement.',
      );
    }
    // AuthorizationError 1000 usually means missing capability on App ID.
    if (
      error.message.includes('1000') ||
      error.message.includes('AuthorizationError')
    ) {
      return new Error(
        'Apple Sign-In capability missing. In Apple Developer → Identifiers → com.visioncart → enable Sign In with Apple, then rebuild.',
      );
    }
    return error;
  }
  return new Error('Apple sign-in failed.');
}

export async function signInWithGoogle(): Promise<AuthResponse> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const result = await GoogleSignin.signIn();
  const idToken =
    result.data?.idToken ?? (await GoogleSignin.getTokens()).idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  return loginWithGoogle(idToken);
}

export async function signInWithApple(): Promise<AuthResponse> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS.');
  }
  if (!appleAuth.isSupported) {
    throw new Error('Apple Sign-In is not supported on this device.');
  }

  let response: AppleRequestResponse;
  try {
    response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
  } catch (error) {
    throw mapAppleError(error);
  }

  // Ensure Apple actually authorized this request (required on iOS).
  const credentialState = await appleAuth.getCredentialStateForUser(
    response.user,
  );
  if (credentialState !== appleAuth.State.AUTHORIZED) {
    throw new Error('Apple did not authorize this sign-in. Please try again.');
  }

  if (!response.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const fullName = [response.fullName?.givenName, response.fullName?.familyName]
    .filter(Boolean)
    .join(' ');

  return loginWithApple(
    response.identityToken,
    fullName.length > 0 ? fullName : undefined,
  );
}
