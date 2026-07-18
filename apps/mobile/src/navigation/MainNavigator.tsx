import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StyleSheet, View} from 'react-native';
import {COLORS} from '../constants';
import {
  Account,
  Boot,
  Cart,
  Checkout,
  Foundation,
  Home,
  Login,
  OrderConfirmation,
  ProductDetail,
  Register,
  TryOnLauncher,
  Welcome,
} from '../screens';
import type {MainTabParamList, RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabDot({focused}: {focused: boolean}) {
  return (
    <View style={[styles.dot, focused ? styles.dotActive : styles.dotInactive]} />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSubtle,
        tabBarIcon: ({focused}) => <TabDot focused={focused} />,
      }}>
      <Tab.Screen
        component={Home}
        name="HomeTab"
        options={{title: 'Shop'}}
      />
      <Tab.Screen
        component={Cart}
        name="CartTab"
        options={{title: 'Cart'}}
      />
      <Tab.Screen
        component={Account}
        name="AccountTab"
        options={{title: 'Account'}}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Boot"
      screenOptions={{headerBackVisible: true}}>
      <Stack.Screen
        component={Boot}
        name="Boot"
        options={{headerShown: false}}
      />
      <Stack.Screen
        component={Welcome}
        name="Welcome"
        options={{headerShown: false}}
      />
      <Stack.Screen
        component={Login}
        name="Login"
        options={{title: 'Sign in'}}
      />
      <Stack.Screen
        component={Register}
        name="Register"
        options={{title: 'Create account'}}
      />
      <Stack.Screen
        component={MainTabs}
        name="Main"
        options={{headerShown: false}}
      />
      <Stack.Screen
        component={ProductDetail}
        name="ProductDetail"
        options={{title: ''}}
      />
      <Stack.Screen
        component={TryOnLauncher}
        name="TryOnLauncher"
        options={{title: 'Try on', presentation: 'modal'}}
      />
      <Stack.Screen
        component={Checkout}
        name="Checkout"
        options={{title: 'Checkout'}}
      />
      <Stack.Screen
        component={OrderConfirmation}
        name="OrderConfirmation"
        options={{title: 'Order placed', headerBackVisible: false}}
      />
      <Stack.Screen
        component={Foundation}
        name="Foundation"
        options={{title: 'Developer'}}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    backgroundColor: COLORS.border,
  },
});
