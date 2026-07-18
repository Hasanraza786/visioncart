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
import {useAuthStore} from '../../store';
import {formatDate, formatPrice, titleCase} from '../../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Account() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const clearSession = useAuthStore(state => state.clearSession);
  const ordersQuery = useOrders();

  const logout = () => {
    clearSession();
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

  const header = (
    <View>
      <Text style={styles.title}>Account</Text>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.email || 'V').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileBody}>
          <Text style={styles.profileName}>{user?.name || 'VisionCart shopper'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Order history</Text>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Button label="Log out" onPress={logout} variant="ghost" />
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

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {ordersQuery.isLoading ? (
        <>
          {header}
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
    marginBottom: SIZES.spacing.xl,
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
  sectionTitle: {
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '700',
    marginBottom: SIZES.spacing.md,
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
