import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import {
  calcProductMargin,
  formatInventoryCurrency,
  formatInventoryQuantity,
  formatProductType,
  getStockHealth,
} from '@/lib/inventory-formatters';
import type { Product } from '@/types/inventory.types';

import {
  VrittStockBar,
  VrittStockChip,
} from '@/components/inventory/VrittStockTone';

interface VrittProductRowProps {
  product: Product;
  currency: string;
  onPress: (productId: string) => void;
}

function Component({ product, currency, onPress }: VrittProductRowProps) {
  const handlePress = useCallback(
    () => onPress(product.id),
    [product.id, onPress],
  );

  const health = getStockHealth(product.currentStock, product.minStock);
  const margin = calcProductMargin(
    product.currentSalePrice,
    product.currentCost,
  );
  const isInactive = product.status !== 'ACTIVE';
  const isRecipe = product.type === 'RECIPE';

  const marginTone =
    margin.percent >= 35
      ? { bg: withAlpha(palette.forest, 0.14), ink: palette.forestDeep }
      : margin.percent >= 15
      ? { bg: withAlpha(palette.amber, 0.14), ink: palette.amberDeep }
      : { bg: withAlpha(palette.danger, 0.14), ink: palette.dangerDeep };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 18,
        gap: 16,
        opacity: isInactive ? 0.55 : 1,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.sm + 2,
            backgroundColor: isRecipe
              ? withAlpha(palette.forest, 0.14)
              : 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isRecipe ? 'leaf-outline' : 'bag-outline'}
            size={17}
            color={
              isRecipe ? palette.forestDeep : text.onPaper.primary
            }
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 14,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            {product.name}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: -0.1,
              marginTop: 3,
            }}
          >
            {formatProductType(product.type)} ·{' '}
            {product.category || 'Sin categoría'}
          </Text>
        </View>

        <VrittStockChip tone={health.tone} label={health.label} size="sm" />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 18,
            fontWeight: '800',
            letterSpacing: -0.5,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatInventoryCurrency(product.currentSalePrice, currency)}
        </Text>
        {Number(product.currentCost) > 0 ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radius.pill,
              backgroundColor: marginTone.bg,
            }}
          >
            <Text
              style={{
                color: marginTone.ink,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 0.4,
                fontVariant: ['tabular-nums'],
              }}
            >
              {margin.percent >= 0 ? '+' : ''}
              {margin.percent.toFixed(0)}% margen
            </Text>
          </View>
        ) : null}
      </View>

      <VrittStockBar tone={health.tone} ratio={health.ratio} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: -0.1,
          }}
        >
          Stock {formatInventoryQuantity(product.currentStock, product.stockUnit)}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: -0.1,
          }}
        >
          Costo {formatInventoryCurrency(product.currentCost, currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const VrittProductRow = memo(Component);
