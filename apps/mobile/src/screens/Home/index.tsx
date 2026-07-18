import NetInfo from '@react-native-community/netinfo';
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
import {isOnline} from '../../query/networkState';
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

function useNetworkOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOnline(isOnline(state));
    });
    return unsubscribe;
  }, []);
  return online;
}

export function Home() {
  const navigation = useNavigation<Nav>();
  const online = useNetworkOnline();
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(
    undefined,
  );
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
    undefined,
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    undefined,
  );
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounced(searchInput.trim());

  const categoriesQuery = useCategories();
  const productsQuery = useProducts(selectedSlug, search || undefined);

  const categoryChips = useMemo(
    () => [
      {id: 0, slug: undefined as string | undefined, name: 'All'},
      ...(categoriesQuery.data ?? []).map(c => ({
        id: c.id,
        slug: c.slug as string | undefined,
        name: c.name,
      })),
    ],
    [categoriesQuery.data],
  );

  const brandChips = useMemo(() => {
    const brands = new Set<string>();
    for (const product of productsQuery.data ?? []) {
      if (product.brand) {
        brands.add(product.brand);
      }
    }
    return Array.from(brands).sort();
  }, [productsQuery.data]);

  const colorChips = useMemo(() => {
    const colors = new Set<string>();
    for (const product of productsQuery.data ?? []) {
      if (product.color) {
        colors.add(product.color);
      }
    }
    return Array.from(colors).sort();
  }, [productsQuery.data]);

  const filteredProducts = useMemo(() => {
    let list = productsQuery.data ?? [];
    if (selectedBrand) {
      list = list.filter(p => p.brand === selectedBrand);
    }
    if (selectedColor) {
      list = list.filter(p => p.color === selectedColor);
    }
    return list;
  }, [productsQuery.data, selectedBrand, selectedColor]);

  const renderProduct = ({item}: {item: Product}) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name} by ${item.brand}`}
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

  const listHeader = (
    <View>
      {!online ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.bannerOffline}>
          <Text style={styles.bannerText}>
            You're offline. Showing cached results when available.
          </Text>
        </View>
      ) : null}
      {productsQuery.isError ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.bannerError}>
          <Text style={styles.bannerText}>
            Couldn't refresh the catalog. Pull to retry.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open favorites"
        onPress={() => navigation.navigate('Favorites')}
        style={styles.favoritesShortcut}>
        <Text style={styles.favoritesShortcutText}>Favorites</Text>
        <Text style={styles.favoritesShortcutChevron}>›</Text>
      </Pressable>

      {brandChips.length > 1 ? (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Brand</Text>
          <View style={styles.chipRow}>
            {['All', ...brandChips].map(item => {
              const value = item === 'All' ? undefined : item;
              const active = selectedBrand === value;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Brand ${item}`}
                  onPress={() => setSelectedBrand(value)}
                  style={[styles.chip, active ? styles.chipActive : null]}>
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {colorChips.length > 1 ? (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Color</Text>
          <View style={styles.chipRow}>
            {['All', ...colorChips].map(item => {
              const value = item === 'All' ? undefined : item;
              const active = selectedColor === value;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${item}`}
                  onPress={() => setSelectedColor(value)}
                  style={[styles.chip, active ? styles.chipActive : null]}>
                  <Text
                    style={[
                      styles.chipText,
                      active ? styles.chipTextActive : null,
                    ]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.brand}>
          {APP_NAME}
        </Text>
        <Text style={styles.brandSub}>Try on. Then buy.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          accessibilityLabel="Search products"
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
          data={categoryChips}
          horizontal
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => {
            const active = item.slug === selectedSlug;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Category ${item.name}`}
                onPress={() => {
                  setSelectedSlug(item.slug);
                  setSelectedBrand(undefined);
                  setSelectedColor(undefined);
                }}
                style={[styles.chip, active ? styles.chipActive : null]}>
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                  ]}>
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
      ) : (
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          data={filteredProducts}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={listHeader}
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
  bannerOffline: {
    backgroundColor: COLORS.backgroundMuted,
    borderRadius: SIZES.radius,
    padding: SIZES.spacing.md,
    marginBottom: SIZES.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderRadius: SIZES.radius,
    padding: SIZES.spacing.md,
    marginBottom: SIZES.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  bannerText: {
    color: COLORS.textMuted,
    fontSize: SIZES.label,
    lineHeight: 20,
  },
  favoritesShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.spacing.md,
    paddingHorizontal: SIZES.spacing.md,
    marginBottom: SIZES.spacing.md,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.primaryMuted,
  },
  favoritesShortcutText: {
    color: COLORS.primary,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  favoritesShortcutChevron: {
    color: COLORS.primary,
    fontSize: SIZES.subheading,
  },
  filterSection: {
    marginBottom: SIZES.spacing.md,
  },
  filterLabel: {
    color: COLORS.textSubtle,
    fontSize: SIZES.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.spacing.sm,
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
