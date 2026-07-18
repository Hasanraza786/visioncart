import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useAddFavorite,
  useAddToCart,
  useFavorites,
  useProduct,
  useRemoveFavorite,
} from '../../api_services';
import {getTryOnCategory} from '../../assets';
import {Button, ProductImage} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store';
import {formatPrice} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetail({navigation, route}: Props) {
  const {productId} = route.params;
  const accessToken = useAuthStore(state => state.accessToken);
  const isSignedIn = Boolean(accessToken);
  const productQuery = useProduct(productId);
  const favoritesQuery = useFavorites(isSignedIn);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const addToCart = useAddToCart();
  const product = productQuery.data;

  const isFavorite = useMemo(() => {
    if (!favoritesQuery.data) {
      return false;
    }
    return favoritesQuery.data.some(fav => fav.product.id === productId);
  }, [favoritesQuery.data, productId]);

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
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          Couldn't load this product.
        </Text>
        <Button
          label="Go back"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    );
  }

  const canTryOn = getTryOnCategory(product.tryon_model_key) !== undefined;
  const favoriteBusy = addFavorite.isPending || removeFavorite.isPending;

  const toggleFavorite = () => {
    if (!isSignedIn) {
      Alert.alert('Sign in required', 'Sign in to save favorites.', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Sign in', onPress: () => navigation.navigate('Login')},
      ]);
      return;
    }
    if (isFavorite) {
      removeFavorite.mutate(product.id);
    } else {
      addFavorite.mutate(product.id);
    }
  };

  const openSeller = () => {
    if (!product.seller_url) {
      return;
    }
    Linking.openURL(product.seller_url).catch(() => {
      Alert.alert('Unable to open link', 'The seller URL could not be opened.');
    });
  };

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

      <View style={styles.titleRow}>
        <View style={styles.titleBody}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text accessibilityRole="header" style={styles.name}>
            {product.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? 'Remove from favorites' : 'Add to favorites'
          }
          accessibilityState={{selected: isFavorite}}
          disabled={favoriteBusy}
          onPress={toggleFavorite}
          style={[styles.favButton, isFavorite ? styles.favButtonActive : null]}>
          <Text style={[styles.favIcon, isFavorite ? styles.favIconActive : null]}>
            {isFavorite ? '♥' : '♡'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.price}>
        {formatPrice(product.price_cents, product.currency)}
      </Text>

      <View style={styles.metaRow}>
        {product.color ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>Color: {product.color}</Text>
          </View>
        ) : null}
        {product.brand ? (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>Brand: {product.brand}</Text>
          </View>
        ) : null}
      </View>

      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}

      {canTryOn ? (
        <Text style={styles.disclaimer}>
          Development preview — not a sizing tool
        </Text>
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
        {product.seller_url ? (
          <Button
            label="View on seller site"
            onPress={openSeller}
            variant="ghost"
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.spacing.md,
  },
  titleBody: {
    flex: 1,
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
  favButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundMuted,
  },
  favButtonActive: {
    borderColor: COLORS.danger,
    backgroundColor: '#FEF2F2',
  },
  favIcon: {
    fontSize: 22,
    color: COLORS.textSubtle,
  },
  favIconActive: {
    color: COLORS.danger,
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
  disclaimer: {
    marginTop: SIZES.spacing.md,
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
    fontStyle: 'italic',
    lineHeight: 20,
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
