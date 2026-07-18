import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useCategories, useProducts, type Product} from '../../api_services';
import {ProductImage} from '../../components';
import {APP_NAME, COLORS, SIZES} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {formatPrice} from '../../utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function useDebounced(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function Home() {
  const navigation = useNavigation<Nav>();
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(
    undefined,
  );
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim());

  const categoriesQuery = useCategories();
  const productsQuery = useProducts(selectedSlug, search || undefined);

  const chips = useMemo(
    () => [{id: 0, slug: undefined, name: 'All'}, ...(categoriesQuery.data ?? []).map(c => ({id: c.id, slug: c.slug, name: c.name}))],
    [categoriesQuery.data],
  );

  const renderProduct = ({item}: {item: Product}) => (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        navigation.navigate('ProductDetail', {
          productId: item.id,
          title: item.name,
        })
      }
      style={styles.card}>
      <ProductImage name={item.name} style={styles.cardImage} uri={item.preview_url} />
      <Text numberOfLines={1} style={styles.cardBrand}>
        {item.brand}
      </Text>
      <Text numberOfLines={2} style={styles.cardName}>
        {item.name}
      </Text>
      <Text style={styles.cardPrice}>
        {formatPrice(item.price_cents, item.currency)}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.brandSub}>Try on. Then buy.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearchInput}
          placeholder="Search products"
          placeholderTextColor={COLORS.textSubtle}
          style={styles.search}
          value={searchInput}
        />
      </View>

      <View style={styles.chipsWrap}>
        <FlatList
          data={chips}
          horizontal
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => {
            const active = item.slug === selectedSlug;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedSlug(item.slug)}
                style={[styles.chip, active ? styles.chipActive : null]}>
                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {productsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : productsQuery.isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Couldn't load products. Pull to retry.
          </Text>
        </View>
      ) : (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          data={productsQuery.data ?? []}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          onRefresh={productsQuery.refetch}
          refreshing={productsQuery.isRefetching}
          renderItem={renderProduct}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No products found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default Home;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZES.spacing.lg,
    paddingTop: SIZES.spacing.sm,
  },
  brand: {
    color: COLORS.text,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
  brandSub: {
    color: COLORS.textSubtle,
    fontSize: SIZES.label,
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: SIZES.spacing.lg,
    paddingTop: SIZES.spacing.md,
  },
  search: {
    minHeight: SIZES.buttonMinHeight,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.backgroundMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.spacing.md,
    color: COLORS.text,
    fontSize: SIZES.body,
  },
  chipsWrap: {
    paddingVertical: SIZES.spacing.md,
    paddingLeft: SIZES.spacing.lg,
  },
  chip: {
    paddingHorizontal: SIZES.spacing.md,
    paddingVertical: SIZES.spacing.sm,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.spacing.sm,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: SIZES.label,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  grid: {
    paddingHorizontal: SIZES.spacing.lg,
    paddingBottom: SIZES.spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: SIZES.spacing.lg,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: SIZES.spacing.sm,
  },
  cardBrand: {
    color: COLORS.textSubtle,
    fontSize: SIZES.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '600',
    marginTop: 2,
  },
  cardPrice: {
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
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: SIZES.body,
    textAlign: 'center',
  },
});
