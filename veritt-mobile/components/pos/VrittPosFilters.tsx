import React, { memo, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { hairline, radius, surface, text } from '@/constants/design-tokens';

export type PosSortKey = 'name' | 'price-asc' | 'price-desc';

export type PosCategory = { name: string; count: number };

type VrittPosFiltersProps = {
  query: string;
  onQueryChange: (q: string) => void;
  categories: PosCategory[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  sort: PosSortKey;
  onSortChange: (sort: PosSortKey) => void;
  resultCount: number;
};

function Component({
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  sort,
  onSortChange,
  resultCount,
}: VrittPosFiltersProps) {
  const clearQuery = useCallback(() => onQueryChange(''), [onQueryChange]);
  const onAll = useCallback(() => onCategoryChange(null), [onCategoryChange]);

  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  );

  const cycleSort = useCallback(() => {
    const next: PosSortKey =
      sort === 'name' ? 'price-asc' : sort === 'price-asc' ? 'price-desc' : 'name';
    onSortChange(next);
  }, [sort, onSortChange]);

  const sortLabel =
    sort === 'name' ? 'A–Z' : sort === 'price-asc' ? 'Precio ↑' : 'Precio ↓';

  return (
    <View style={{ gap: 12 }}>
      {/* Search + sort row */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 18 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: radius.md,
            backgroundColor: surface.card,
            borderWidth: 1,
            borderColor: hairline.onPaper,
          }}
        >
          <Ionicons
            name="search"
            size={15}
            color={text.onPaper.muted}
          />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Buscar producto"
            placeholderTextColor={text.onPaper.muted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
            style={{
              flex: 1,
              color: text.onPaper.primary,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: -0.2,
              padding: 0,
            }}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={clearQuery} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={text.onPaper.subtle}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={cycleSort}
          activeOpacity={0.88}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: radius.md,
            backgroundColor: surface.card,
            borderWidth: 1,
            borderColor: hairline.onPaper,
          }}
        >
          <Ionicons
            name="swap-vertical"
            size={14}
            color={text.onPaper.primary}
          />
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: -0.2,
            }}
          >
            {sortLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categorías */}
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingHorizontal: 18,
          }}
        >
          <Chip
            label="Todo"
            count={totalCount}
            isActive={activeCategory === null}
            onPress={onAll}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.name}
              label={c.name}
              count={c.count}
              isActive={activeCategory === c.name}
              onChange={onCategoryChange}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Contador de resultados (sólo si hay filtro activo) */}
      {query.length > 0 || activeCategory !== null ? (
        <View
          style={{
            paddingHorizontal: 22,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {resultCount === 0
              ? 'Sin resultados'
              : resultCount === 1
              ? '1 producto'
              : `${resultCount} productos`}
          </Text>
          {query.length > 0 || activeCategory !== null ? (
            <TouchableOpacity
              onPress={() => {
                onQueryChange('');
                onCategoryChange(null);
              }}
            >
              <Text
                style={{
                  color: text.onPaper.primary,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Limpiar
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CategoryChipInner({
  label,
  count,
  isActive,
  onChange,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onChange: (category: string) => void;
}) {
  const onPress = useCallback(() => onChange(label), [label, onChange]);
  return (
    <Chip
      label={label}
      count={count}
      isActive={isActive}
      onPress={onPress}
    />
  );
}
const CategoryChip = memo(CategoryChipInner);

function ChipInner({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: isActive ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: isActive ? surface.ink : hairline.onPaper,
      }}
    >
      <Text
        style={{
          color: isActive ? text.onInk.primary : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.2,
        }}
      >
        {label}
      </Text>
      {typeof count === 'number' ? (
        <Text
          style={{
            color: isActive
              ? 'rgba(245,242,234,0.55)'
              : text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}
        >
          {count}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
const Chip = memo(ChipInner);

export const VrittPosFilters = memo(Component);
