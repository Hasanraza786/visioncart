import React from 'react';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import {tryOnSdk} from '@visioncart/tryon-sdk';
import type {ComponentProps} from 'react';
import {Boot} from '../src/screens/Boot';
import {Foundation} from '../src/screens/Foundation';
import {useAuthStore, useFoundationStore} from '../src/store';
import {renderWithProviders} from '../src/test/render';

jest.mock('@visioncart/tryon-sdk', () => ({
  tryOnSdk: {
    clearCache: jest.fn(),
    isSupported: jest.fn(),
    open: jest.fn(),
  },
}));

const mockedTryOnSdk = jest.mocked(tryOnSdk);

describe('Boot routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setHasHydrated(false);
  });

  const makeNavigation = (replace: jest.Mock) =>
    ({replace} as unknown as ComponentProps<typeof Boot>['navigation']);

  const route = {key: 'boot-test', name: 'Boot' as const};

  test('routes to Welcome when no session is stored', async () => {
    const replace = jest.fn();
    useAuthStore.getState().setHasHydrated(true);

    await renderWithProviders(
      <Boot navigation={makeNavigation(replace)} route={route} />,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Welcome'));
  });

  test('routes to Main when a token is present', async () => {
    const replace = jest.fn();
    useAuthStore.getState().setTokens({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'bearer',
      expires_in: 900,
    });
    useAuthStore.getState().setHasHydrated(true);

    await renderWithProviders(
      <Boot navigation={makeNavigation(replace)} route={route} />,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('Main'));
  });
});

describe('Foundation developer screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedTryOnSdk.isSupported.mockResolvedValue({
      supported: true,
      category: 'glasses',
      engine: 'placeholder',
    });
    mockedTryOnSdk.open.mockResolvedValue({
      sessionId: 'foundation-test',
      outcome: 'cancelled',
      durationMs: 10,
    });
    useFoundationStore.getState().reset();
  });

  test('renders deterministic foundation state', async () => {
    useFoundationStore.getState().completeBoot();

    await renderWithProviders(<Foundation />);

    expect(screen.getByText('Mobile foundation')).toBeTruthy();
    expect(screen.getByText('development')).toBeTruthy();
    expect(screen.getByText('Complete')).toBeTruthy();
  });

  test('opens and closes the native placeholder session', async () => {
    useFoundationStore.getState().completeBoot();
    await renderWithProviders(<Foundation />);

    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', {name: 'Open native placeholder'}),
      );
    });

    expect(await screen.findByText('Closed: cancelled')).toBeTruthy();
    expect(mockedTryOnSdk.isSupported).toHaveBeenCalledWith('glasses');
    expect(mockedTryOnSdk.open).toHaveBeenCalledTimes(1);
  });
});
