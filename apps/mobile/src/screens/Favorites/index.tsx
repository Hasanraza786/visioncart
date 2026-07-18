import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFavorites, type Favorite} from '../../api_services';
import {Button, ProductImage} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store';
import {formatPrice} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function Favorites({navigation}: Props) {
  const accessToken = useAuthStore(state => state.accessToken);
  const isSignedIn = Boolean(accessToken);
  const favoritesQuery = useFavorites(isSignedIn);

  if (!isSignedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>
          Sign in to save products and sync favorites across devices.
        </Text>
        <Button
          label="Sign in"
          onPress={() => navigation.navigate('Login')}
          style={styles.action}
        />
      </View>
    );
  }

  if (favoritesQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (favoritesQuery.isError) {
    return (
      <View style={styles.center}>
        <Text accessibilityLiveRegion="polite" style={styles.empty}>
          Couldn't load favorites.
        </Text>
        <Button
          label="Try again"
          onPress={() => favoritesQuery.refetch()}
          variant="secondary"
        />
      </View>
    );
  }

  const renderItem = ({item}: {item: Favorite}) => {
    const product = item.product;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.brand}`}
        onPress={() =>
          navigation.navigate('ProductDetail', {
            productId: product.id,
            title: product.name,
          })
        }
        style={styles.row}>
        <ProductImage
          name={product.name}
          style={styles.thumb}
          uri={product.preview_url}
        />
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={styles.brand}>
            {product.brand}
          </Text>
          <Text numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>
          <Text style={styles.price}>
            {formatPrice(product.price_cents, product.currency)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={favoritesQuery.data ?? []}
      keyExtractor={item => String(item.product.id)}
      ListEmptyComponent={
        <Text style={styles.empty}>No favorites yet. Heart a product to save it.</Text>
      }
      onRefresh={favoritesQuery.refetch}
      refreshing={favoritesQuery.isRefetching}
      renderItem={renderItem}
      style={styles.container}
    />
  );
}

export default Favorites;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SIZES.spacing.lg,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: SIZES.spacing.lg,
    gap: SIZES.spacing.md,
  },
  thumb: {
    width: 88,
    height: 88,
  },
  rowBody: {
    flex: 1,
    justifyContent: 'center',
  },
  brand: {
    color: COLORS.textSubtle,
    fontSize: SIZES.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  price: {
    marginTop: SIZES.spacing.xs,
    color: COLORS.primary,
    fontSize: SIZES.body,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.spacing.xl,
    backgroundColor: COLORS.background,
    gap: SIZES.spacing.md,
  },
  empty: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: SIZES.spacing.sm,
  },
});
