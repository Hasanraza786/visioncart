import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  useCart,
  useCreateOrder,
  type ShippingAddress,
} from '../../api_services';
import {Button, TextField} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {formatPrice} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

type FormState = {
  full_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
};

const EMPTY_FORM: FormState = {
  full_name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  phone: '',
};

export function Checkout({navigation}: Props) {
  const cartQuery = useCart();
  const createOrder = useCreateOrder();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const cart = cartQuery.data;
  const total = cart?.subtotal_cents ?? 0;

  const setField = (key: keyof FormState) => (value: string) =>
    setForm(prev => ({...prev, [key]: value}));

  const placeOrder = () => {
    setError(null);
    const required: (keyof FormState)[] = [
      'full_name',
      'line1',
      'city',
      'postal_code',
      'country',
      'phone',
    ];
    const missing = required.find(key => !form[key].trim());
    if (missing) {
      setError('Please complete all required fields.');
      return;
    }

    const shipping: ShippingAddress = {
      full_name: form.full_name.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim() || null,
      city: form.city.trim(),
      state: form.state.trim() || null,
      postal_code: form.postal_code.trim(),
      country: form.country.trim(),
      phone: form.phone.trim(),
    };

    createOrder.mutate(
      {shipping},
      {
        onSuccess: order =>
          navigation.replace('OrderConfirmation', {orderId: order.id}),
        onError: (err: unknown) =>
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not place your order. Please try again.',
          ),
      },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Shipping address</Text>

        <TextField
          autoCapitalize="words"
          label="Full name *"
          onChangeText={setField('full_name')}
          placeholder="Alex Doe"
          value={form.full_name}
        />
        <TextField
          label="Address line 1 *"
          onChangeText={setField('line1')}
          placeholder="123 Market St"
          value={form.line1}
        />
        <TextField
          label="Address line 2"
          onChangeText={setField('line2')}
          placeholder="Apartment, suite (optional)"
          value={form.line2}
        />
        <TextField
          autoCapitalize="words"
          label="City *"
          onChangeText={setField('city')}
          placeholder="San Francisco"
          value={form.city}
        />
        <TextField
          autoCapitalize="words"
          label="State / Province"
          onChangeText={setField('state')}
          placeholder="California (optional)"
          value={form.state}
        />
        <TextField
          label="Postal code *"
          onChangeText={setField('postal_code')}
          placeholder="94103"
          value={form.postal_code}
        />
        <TextField
          autoCapitalize="words"
          label="Country *"
          onChangeText={setField('country')}
          placeholder="United States"
          value={form.country}
        />
        <TextField
          keyboardType="phone-pad"
          label="Phone *"
          onChangeText={setField('phone')}
          placeholder="+1 555 123 4567"
          value={form.phone}
        />

        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment</Text>
          <View style={styles.paymentRow}>
            <View style={styles.radioOn} />
            <View style={styles.paymentBody}>
              <Text style={styles.paymentMethod}>Cash on delivery</Text>
              <Text style={styles.paymentHint}>Pay when your order arrives.</Text>
            </View>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(total, cart?.currency)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.free}>Free</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatPrice(total, cart?.currency)}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          disabled={total === 0}
          label="Place order"
          loading={createOrder.isPending}
          onPress={placeOrder}
          style={styles.placeButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default Checkout;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.spacing.lg,
  },
  section: {
    marginBottom: SIZES.spacing.md,
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '800',
  },
  paymentCard: {
    marginTop: SIZES.spacing.sm,
    padding: SIZES.spacing.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundMuted,
  },
  paymentTitle: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '700',
    marginBottom: SIZES.spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 6,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    marginRight: SIZES.spacing.md,
  },
  paymentBody: {
    flex: 1,
  },
  paymentMethod: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  paymentHint: {
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
  },
  summary: {
    marginTop: SIZES.spacing.lg,
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
    fontWeight: '700',
  },
  free: {
    color: COLORS.success,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  totalRow: {
    marginTop: SIZES.spacing.xs,
    paddingTop: SIZES.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: SIZES.subheading,
    fontWeight: '800',
  },
  totalValue: {
    color: COLORS.primary,
    fontSize: SIZES.subheading,
    fontWeight: '800',
  },
  error: {
    marginTop: SIZES.spacing.md,
    color: COLORS.danger,
    fontSize: SIZES.label,
  },
  placeButton: {
    marginTop: SIZES.spacing.lg,
  },
});
