import {BUILD_ENVIRONMENT} from './generatedEnvironment';

export type AppEnvironmentName = 'development' | 'staging' | 'production';

export type RuntimeEnvironment = Readonly<{
  name: AppEnvironmentName;
  apiBaseUrl: string;
  enableDiagnostics: boolean;
}>;

/**
 * Local API host.
 *
 * - iOS simulator can reach the Mac via 127.0.0.1.
 * - Android emulator maps the host to 10.0.2.2.
 * - Real devices must use the Mac's LAN IP (e.g. http://192.168.1.20:8000).
 *
 * Override at runtime without editing this file by setting
 * `globalThis.APP_API_BASE_URL` (development only), which lets you point the
 * app at your Mac's LAN IP read from an env/constant during local dev.
 */
// Real devices on the LAN need the Mac host IP (not 127.0.0.1).
// Override anytime via globalThis.APP_API_BASE_URL.
export const DEV_API_BASE_URL = 'http://192.168.100.7:8000';

const environmentConfigs: Record<AppEnvironmentName, unknown> = {
  development: {
    name: 'development',
    apiBaseUrl: DEV_API_BASE_URL,
    enableDiagnostics: true,
  },
  staging: {
    name: 'staging',
    apiBaseUrl: 'https://api.staging.visioncart.example',
    enableDiagnostics: true,
  },
  production: {
    name: 'production',
    apiBaseUrl: 'https://api-flax-omega.vercel.app',
    enableDiagnostics: false,
  },
};

function isEnvironmentName(value: unknown): value is AppEnvironmentName {
  return (
    value === 'development' || value === 'staging' || value === 'production'
  );
}

function parseProtocol(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return new URL(value).protocol;
  } catch {
    return null;
  }
}

/**
 * Development may talk to a local API over http (simulators, LAN devices).
 * Staging and production always require https.
 */
function isValidApiUrl(value: unknown, name: AppEnvironmentName): boolean {
  const protocol = parseProtocol(value);
  if (protocol === null) {
    return false;
  }

  if (name === 'development') {
    return protocol === 'http:' || protocol === 'https:';
  }

  return protocol === 'https:';
}

export function parseRuntimeEnvironment(value: unknown): RuntimeEnvironment {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Runtime environment must be an object.');
  }

  const candidate = value as Record<string, unknown>;

  if (!isEnvironmentName(candidate.name)) {
    throw new Error('Runtime environment has an invalid name.');
  }

  if (!isValidApiUrl(candidate.apiBaseUrl, candidate.name)) {
    throw new Error(
      candidate.name === 'development'
        ? 'Runtime environment requires an http(s) API URL.'
        : 'Runtime environment requires an HTTPS API URL.',
    );
  }

  if (typeof candidate.enableDiagnostics !== 'boolean') {
    throw new Error('Runtime environment has an invalid diagnostics flag.');
  }

  return {
    name: candidate.name,
    apiBaseUrl: candidate.apiBaseUrl as string,
    enableDiagnostics: candidate.enableDiagnostics,
  };
}

type RuntimeGlobal = typeof globalThis & {
  APP_ENV?: unknown;
  APP_API_BASE_URL?: unknown;
};

function resolveConfig(name: AppEnvironmentName): unknown {
  const base = environmentConfigs[name];

  // Development-only override so a device can target the Mac's LAN IP without
  // editing checked-in config.
  if (name === 'development') {
    const override = (globalThis as RuntimeGlobal).APP_API_BASE_URL;
    if (typeof override === 'string' && override.length > 0) {
      return {...(base as object), apiBaseUrl: override};
    }
  }

  return base;
}

export function selectEnvironment(
  appEnvironment: unknown = (globalThis as RuntimeGlobal).APP_ENV ??
    BUILD_ENVIRONMENT,
): RuntimeEnvironment {
  const name = isEnvironmentName(appEnvironment)
    ? appEnvironment
    : 'development';

  return parseRuntimeEnvironment(resolveConfig(name));
}

export const environment = selectEnvironment();
