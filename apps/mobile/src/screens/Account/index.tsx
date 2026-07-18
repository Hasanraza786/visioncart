import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useOrders, type Order} from '../../api_services';
import {Button} from '../../components';
import {COLORS, SIZES} from '../../constants';
import {environment} from '../../config/environment';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore, useGuestStore} from '../../store';
import {formatDate, formatPrice, titleCase} from '../../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Account() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const accessToken = useAuthStore(state => state.accessToken);
  const clearSession = useAuthStore(state => state.clearSession);
  const guestKey = useGuestStore(state => state.guestKey);
  const clearGuest = useGuestStore(state => state.clearGuest);
  const isSignedIn = Boolean(accessToken);
  const ordersQuery = useOrders(isSignedIn);

  const logout = () => {
    clearSession();
    clearGuest();
    queryClient.clear();
    navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
  };

  const renderOrder = ({item}: {item: Order}) => (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <Text style={styles.orderId}>Order #{item.id}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{titleCase(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.orderMeta}>
        {formatDate(item.created_at)} · {item.items.length}{' '}
        {item.items.length === 1 ? 'item' : 'items'}
      </Text>
      <Text style={styles.orderTotal}>
        {formatPrice(item.total_cents, item.currency)}
      </Text>
    </View>
  );

  const links = (
    <View style={styles.links}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favorites"
        onPress={() => navigation.navigate('Favorites')}
        style={styles.linkRow}>
        <Text style={styles.linkText}>Favorites</Text>
        <Text style={styles.linkChevron}>›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recently tried"
        onPress={() => navigation.navigate('RecentlyTried')}
        style={styles.linkRow}>
        <Text style={styles.linkText}>Recently tried</Text>
        <Text style={styles.linkChevron}>›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => navigation.navigate('Settings')}
        style={styles.linkRow}>
        <Text style={styles.linkText}>Settings</Text>
        <Text style={styles.linkChevron}>›</Text>
      </Pressable>
    </View>
  );

  const header = (
    <View>
      <Text accessibilityRole="header" style={styles.title}>
        Account
      </Text>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {isSignedIn
              ? (user?.name || user?.email || 'V').charAt(0).toUpperCase()
              : 'G'}
          </Text>
        </View>
        <View style={styles.profileBody}>
          {isSignedIn ? (
            <>
              <Text style={styles.profileName}>
                {user?.name || 'VisionCart shopper'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </>
          ) : (
            <>
              <Text style={styles.profileName}>Guest shopper</Text>
              <Text style={styles.profileEmail}>
                {guestKey
                  ? 'Browsing without an account'
                  : 'Sign in to sync favorites and orders'}
              </Text>
            </>
          )}
        </View>
      </View>
      {links}
      {isSignedIn ? (
        <Text style={styles.sectionTitle}>Order history</Text>
      ) : (
        <View style={styles.guestPrompt}>
          <Text style={styles.guestPromptText}>
            Create an account to place orders and save favorites.
          </Text>
          <Button
            label="Sign in"
            onPress={() => navigation.navigate('Login')}
            style={styles.guestButton}
          />
          <Button
            label="Create account"
            onPress={() => navigation.navigate('Register')}
            variant="secondary"
          />
        </View>
      )}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {isSignedIn ? (
        <Button label="Log out" onPress={logout} variant="ghost" />
      ) : null}
      {environment.enableDiagnostics ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Foundation')}
          style={styles.devLink}>
          <Text style={styles.devText}>Developer tools</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!isSignedIn) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.list}>{header}</View>
        {footer}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {ordersQuery.isLoading ? (
        <>
          <View style={styles.list}>{header}</View>
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
          {footer}
        </>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={ordersQuery.data ?? []}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          renderItem={renderOrder}
          ListEmptyComponent={
            <Text style={styles.empty}>No orders yet.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default Account;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SIZES.spacing.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.spacing.lg,
    marginBottom: SIZES.spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: SIZES.subheading,
    fontWeight: '800',
  },
  profileBody: {
    marginLeft: SIZES.spacing.md,
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  profileEmail: {
    marginTop: 2,
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
  links: {
    marginBottom: SIZES.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  linkText: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  linkChevron: {
    color: COLORS.textSubtle,
    fontSize: SIZES.subheading,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '700',
    marginBottom: SIZES.spacing.md,
  },
  guestPrompt: {
    gap: SIZES.spacing.md,
    marginBottom: SIZES.spacing.lg,
  },
  guestPromptText: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    lineHeight: 24,
  },
  guestButton: {
    marginTop: SIZES.spacing.xs,
  },
  orderCard: {
    padding: SIZES.spacing.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.spacing.md,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: SIZES.spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.primaryMuted,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: SIZES.caption,
    fontWeight: '700',
  },
  orderMeta: {
    marginTop: SIZES.spacing.xs,
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
  orderTotal: {
    marginTop: SIZES.spacing.xs,
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '800',
  },
  empty: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    paddingVertical: SIZES.spacing.lg,
  },
  center: {
    paddingVertical: SIZES.spacing.xl,
    alignItems: 'center',
  },
  footer: {
    marginTop: SIZES.spacing.lg,
    paddingHorizontal: SIZES.spacing.lg,
    gap: SIZES.spacing.md,
  },
  devLink: {
    alignItems: 'center',
    paddingVertical: SIZES.spacing.sm,
  },
  devText: {
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
});
