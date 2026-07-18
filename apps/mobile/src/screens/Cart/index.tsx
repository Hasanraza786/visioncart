import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
  type CartItem,
} from '../../api_services';
import {Button, ProductImage} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {formatPrice} from '../../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function Cart() {
  const navigation = useNavigation<Nav>();
  const cartQuery = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const mutating = updateItem.isPending || removeItem.isPending;

  const changeQuantity = (item: CartItem, delta: number) => {
    const next = item.quantity + delta;
    if (next <= 0) {
      removeItem.mutate(item.id);
      return;
    }
    updateItem.mutate({itemId: item.id, quantity: next});
  };

  const renderItem = ({item}: {item: CartItem}) => (
    <View style={styles.row}>
      <ProductImage
        name={item.product.name}
        style={styles.thumb}
        uri={item.product.preview_url}
      />
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.name}>
          {item.product.name}
        </Text>
        <Text style={styles.unit}>
          {formatPrice(item.product.price_cents, item.product.currency)}
        </Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityLabel="Decrease quantity"
            accessibilityRole="button"
            disabled={mutating}
            onPress={() => changeQuantity(item, -1)}
            style={styles.stepButton}>
            <Text style={styles.stepLabel}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{item.quantity}</Text>
          <Pressable
            accessibilityLabel="Increase quantity"
            accessibilityRole="button"
            disabled={mutating}
            onPress={() => changeQuantity(item, 1)}
            style={styles.stepButton}>
            <Text style={styles.stepLabel}>+</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.lineTotal}>
          {formatPrice(item.line_total_cents, item.product.currency)}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={mutating}
          onPress={() => removeItem.mutate(item.id)}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );

  if (cartQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={styles.header}>Your cart</Text>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Browse the shop and add something you love.
          </Text>
          <Button
            label="Start shopping"
            onPress={() => navigation.navigate('Main', {screen: 'HomeTab'})}
            variant="secondary"
          />
        </View>
      ) : (
        <>
          <FlatList
            contentContainerStyle={styles.list}
            data={items}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
          />
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatPrice(cart?.subtotal_cents ?? 0, cart?.currency)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.free}>Free</Text>
            </View>
            <Button
              label="Proceed to checkout"
              onPress={() => navigation.navigate('Checkout')}
              style={styles.checkout}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

export default Cart;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZES.spacing.lg,
    paddingTop: SIZES.spacing.sm,
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
  list: {
    padding: SIZES.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    marginBottom: SIZES.spacing.lg,
  },
  thumb: {
    width: 72,
    height: 72,
  },
  rowBody: {
    flex: 1,
    marginLeft: SIZES.spacing.md,
  },
  name: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  unit: {
    marginTop: 2,
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.spacing.sm,
    gap: SIZES.spacing.md,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '700',
  },
  qty: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  rowRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: SIZES.spacing.sm,
  },
  lineTotal: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '800',
  },
  remove: {
    color: COLORS.danger,
    fontSize: SIZES.label,
    fontWeight: '600',
  },
  footer: {
    padding: SIZES.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacing.sm,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '800',
  },
  free: {
    color: COLORS.success,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  checkout: {
    marginTop: SIZES.spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacing.xl,
    gap: SIZES.spacing.md,
    backgroundColor: COLORS.background,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
});
