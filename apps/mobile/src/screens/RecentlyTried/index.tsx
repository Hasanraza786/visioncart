import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRecentTried, type RecentlyTried} from '../../api_services';
import {Button, ProductImage} from '../../components';
import {COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore, useGuestStore} from '../../store';
import {formatDate, formatPrice} from '../../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'RecentlyTried'>;

export function RecentlyTriedScreen({navigation}: Props) {
  const accessToken = useAuthStore(state => state.accessToken);
  const guestKey = useGuestStore(state => state.guestKey);
  const isSignedIn = Boolean(accessToken);
  const recentQuery = useRecentTried(
    isSignedIn ? null : guestKey,
    isSignedIn || Boolean(guestKey),
  );

  if (recentQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (recentQuery.isError) {
    return (
      <View style={styles.center}>
        <Text accessibilityLiveRegion="polite" style={styles.empty}>
          Couldn't load recently tried products.
        </Text>
        <Button
          label="Try again"
          onPress={() => recentQuery.refetch()}
          variant="secondary"
        />
      </View>
    );
  }

  const renderItem = ({item}: {item: RecentlyTried}) => {
    const product = item.product;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, tried ${formatDate(item.last_tried_at)}`}
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
          <Text style={styles.meta}>
            {formatPrice(product.price_cents, product.currency)} ·{' '}
            {formatDate(item.last_tried_at)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={recentQuery.data ?? []}
      keyExtractor={item => String(item.product.id)}
      ListEmptyComponent={
        <Text style={styles.empty}>
          No try-on sessions yet. Open a product and tap Try on.
        </Text>
      }
      onRefresh={recentQuery.refetch}
      refreshing={recentQuery.isRefetching}
      renderItem={renderItem}
      style={styles.container}
    />
  );
}

export default RecentlyTriedScreen;

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
  meta: {
    marginTop: SIZES.spacing.xs,
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
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
});
