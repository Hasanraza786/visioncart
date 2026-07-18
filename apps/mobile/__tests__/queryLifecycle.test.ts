import { isOnline } from '../src/query/networkState';

describe('query connectivity', () => {
  test.each([
    [true, true, true],
    [true, null, true],
    [true, false, false],
    [false, true, false],
    [null, null, false],
  ])(
    'maps connected=%s reachable=%s to online=%s',
    (isConnected, isInternetReachable, expected) => {
      expect(isOnline({ isConnected, isInternetReachable })).toBe(expected);
    },
  );
});
