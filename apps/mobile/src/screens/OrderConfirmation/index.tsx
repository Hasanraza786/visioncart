import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import {StyleSheet, Text, View} from 'react-native';
import {ordersApi, queryKeys} from '../../api_services';
import {Button} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {formatPrice} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderConfirmation'>;

export function OrderConfirmation({navigation, route}: Props) {
  const {orderId} = route.params;
  const orderQuery = useQuery({
    queryKey: [...queryKeys.orders, orderId],
    queryFn: () => ordersApi.getOrder(orderId),
  });
  const order = orderQuery.data;

  return (
    <View style={styles.container}>
      <View style={styles.check}>
        <Text style={styles.checkMark}>✓</Text>
      </View>
      <Text style={styles.title}>Order placed!</Text>
      <Text style={styles.subtitle}>
        Thanks for your order. We'll get it ready for delivery.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Order number</Text>
          <Text style={styles.cardValue}>#{orderId}</Text>
        </View>
        {order ? (
          <>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Items</Text>
              <Text style={styles.cardValue}>{order.items.length}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Payment</Text>
              <Text style={styles.cardValue}>Cash on delivery</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Total</Text>
              <Text style={styles.total}>
                {formatPrice(order.total_cents, order.currency)}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label="View my orders"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{name: 'Main', params: {screen: 'AccountTab'}}],
            })
          }
          variant="secondary"
        />
        <Button
          label="Continue shopping"
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{name: 'Main', params: {screen: 'HomeTab'}}],
            })
          }
          style={styles.continue}
        />
      </View>
    </View>
  );
}

export default OrderConfirmation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.spacing.lg,
  },
  checkMark: {
    color: COLORS.success,
    fontSize: SIZES.title,
    fontWeight: '800',
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: SIZES.spacing.sm,
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    alignSelf: 'stretch',
    marginTop: SIZES.spacing.xl,
    padding: SIZES.spacing.lg,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundMuted,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacing.sm,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
  },
  cardValue: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  total: {
    color: COLORS.primary,
    fontSize: SIZES.body,
    fontWeight: '800',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: SIZES.spacing.xl,
    gap: SIZES.spacing.md,
  },
  continue: {
    marginTop: SIZES.spacing.sm,
  },
});
