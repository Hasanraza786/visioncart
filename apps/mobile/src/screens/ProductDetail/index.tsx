import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useAddToCart, useProduct} from '../../api_services';
import {getTryOnCategory} from '../../assets';
import {Button, ProductImage} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {formatPrice} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetail({navigation, route}: Props) {
  const {productId} = route.params;
  const productQuery = useProduct(productId);
  const addToCart = useAddToCart();
  const product = productQuery.data;

  useEffect(() => {
    if (product?.name) {
      navigation.setOptions({title: product.name});
    }
  }, [navigation, product?.name]);

  if (productQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Couldn't load this product.</Text>
        <Button
          label="Go back"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    );
  }

  const canTryOn = getTryOnCategory(product.tryon_model_key) !== undefined;

  const handleAddToCart = () => {
    addToCart.mutate(
      {productId: product.id, quantity: 1},
      {
        onSuccess: () => {
          Alert.alert('Added to cart', `${product.name} is in your cart.`, [
            {text: 'Keep shopping', style: 'cancel'},
            {
              text: 'View cart',
              onPress: () => navigation.navigate('Main', {screen: 'CartTab'}),
            },
          ]);
        },
        onError: () => {
          Alert.alert('Something went wrong', 'Could not add to cart.');
        },
      },
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.container}>
      <ProductImage
        name={product.name}
        style={styles.image}
        uri={product.preview_url}
      />

      <Text style={styles.brand}>{product.brand}</Text>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>
        {formatPrice(product.price_cents, product.currency)}
      </Text>

      <View style={styles.metaRow}>
        {product.color ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>Color: {product.color}</Text>
          </View>
        ) : null}
      </View>

      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}

      <View style={styles.actions}>
        {canTryOn ? (
          <Button
            label="Try on"
            onPress={() =>
              navigation.navigate('TryOnLauncher', {productId: product.id})
            }
            variant="secondary"
          />
        ) : null}
        <Button
          label="Add to cart"
          loading={addToCart.isPending}
          onPress={handleAddToCart}
          style={styles.addButton}
        />
      </View>
    </ScrollView>
  );
}

export default ProductDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.spacing.lg,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: SIZES.spacing.lg,
  },
  brand: {
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    marginTop: SIZES.spacing.xs,
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
  price: {
    marginTop: SIZES.spacing.sm,
    color: COLORS.primary,
    fontSize: SIZES.subheading,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.spacing.md,
    gap: SIZES.spacing.sm,
  },
  metaPill: {
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.xs,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: SIZES.label,
  },
  description: {
    marginTop: SIZES.spacing.lg,
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    lineHeight: 24,
  },
  actions: {
    marginTop: SIZES.spacing.xl,
    gap: SIZES.spacing.md,
  },
  addButton: {
    marginTop: SIZES.spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacing.xl,
    gap: SIZES.spacing.md,
    backgroundColor: COLORS.background,
  },
  error: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
  },
});
