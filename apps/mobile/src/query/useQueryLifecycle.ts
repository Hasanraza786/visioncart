import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { isOnline } from './networkState';

export function useQueryLifecycle(): void {
  useEffect(
    () =>
      onlineManager.setEventListener(setOnline =>
        NetInfo.addEventListener(state => {
          setOnline(isOnline(state));
        }),
      ),
    [],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });

    return () => subscription.remove();
  }, []);
}
