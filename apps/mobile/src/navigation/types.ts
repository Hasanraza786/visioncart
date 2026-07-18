import type {NavigatorScreenParams} from '@react-navigation/native';

export type MainTabParamList = {
  HomeTab: undefined;
  CartTab: undefined;
  AccountTab: undefined;
};

export type RootStackParamList = {
  Boot: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ProductDetail: {productId: number; title?: string};
  TryOnLauncher: {productId: number};
  Checkout: undefined;
  OrderConfirmation: {orderId: number};
  Favorites: undefined;
  RecentlyTried: undefined;
  Settings: undefined;
  Foundation: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
