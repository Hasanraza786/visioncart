type ConnectivityState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export function isOnline(state: ConnectivityState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
