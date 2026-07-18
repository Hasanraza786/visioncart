/**
 * Jest global setup.
 * Provide an in-memory AsyncStorage mock so the zustand persist middleware
 * (auth-store) works in tests without a native module.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve(null);
      }),
      getItem: jest.fn(key => Promise.resolve(key in store ? store[key] : null)),
      removeItem: jest.fn(key => {
        delete store[key];
        return Promise.resolve(null);
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve(null);
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
      multiGet: jest.fn(keys =>
        Promise.resolve(keys.map(key => [key, key in store ? store[key] : null])),
      ),
      multiSet: jest.fn(pairs => {
        pairs.forEach(([key, value]) => {
          store[key] = value;
        });
        return Promise.resolve(null);
      }),
      multiRemove: jest.fn(keys => {
        keys.forEach(key => delete store[key]);
        return Promise.resolve(null);
      }),
    },
  };
});
