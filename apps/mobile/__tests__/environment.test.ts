import {
  parseRuntimeEnvironment,
  selectEnvironment,
} from '../src/config/environment';

describe('runtime environment', () => {
  test('selects a checked-in environment', () => {
    expect(selectEnvironment('production')).toEqual({
      name: 'production',
      apiBaseUrl: 'https://api.visioncart.example',
      enableDiagnostics: false,
    });
  });

  test('defaults safely when APP_ENV is missing or invalid', () => {
    expect(selectEnvironment(undefined).name).toBe('development');
    expect(selectEnvironment('preview').name).toBe('development');
  });

  test('development uses a local http API url', () => {
    const dev = selectEnvironment('development');
    expect(dev.name).toBe('development');
    expect(dev.apiBaseUrl.startsWith('http://')).toBe(true);
  });

  test('development accepts http api urls', () => {
    expect(() =>
      parseRuntimeEnvironment({
        name: 'development',
        apiBaseUrl: 'http://127.0.0.1:8000',
        enableDiagnostics: true,
      }),
    ).not.toThrow();
  });

  test('rejects http for production', () => {
    expect(() =>
      parseRuntimeEnvironment({
        name: 'production',
        apiBaseUrl: 'http://api.visioncart.example',
        enableDiagnostics: false,
      }),
    ).toThrow('HTTPS');
  });
});
