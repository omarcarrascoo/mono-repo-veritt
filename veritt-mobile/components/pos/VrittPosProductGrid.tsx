import React, { memo, useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Product } from '@/types/inventory.types';
import { hairline, radius, surface, text } from '@/constants/design-tokens';

type VrittPosProductGridProps = {
  /** Lista ya filtrada — el padre aplica search/category/sort. */
  products: Product[];
  cartQuantityByProductId: Record<string, number>;
  onAdd: (product: Product) => void;
};

const GAP = 10;
const COLUMNS = 2;

function Component({
  products,
  cartQuantityByProductId,
  onAdd,
}: VrittPosProductGridProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth((prev) =>
      w > 0 && Math.abs(w - prev) > 0.5 ? w : prev,
    );
  }, []);

  const tileWidth =
    containerWidth > 0 ? (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
      }}
    >
      {products.map((p) => (
        <ProductTile
          key={p.id}
          product={p}
          width={tileWidth}
          quantity={cartQuantityByProductId[p.id] ?? 0}
          onAdd={onAdd}
        />
      ))}
    </View>
  );
}

type ProductTileProps = {
  product: Product;
  width: number;
  quantity: number;
  onAdd: (product: Product) => void;
};

function ProductTileInner({
  product,
  width,
  quantity,
  onAdd,
}: ProductTileProps) {
  const handlePress = useCallback(() => onAdd(product), [onAdd, product]);
  if (width <= 0) return null;

  const price = Number(product.currentSalePrice);
  const inCart = quantity > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handlePress}
      style={{
        width,
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: surface.card,
        borderWidth: 1,
        borderColor: inCart ? 'rgba(11,14,18,0.3)' : hairline.onPaper,
        minHeight: 124,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm + 2,
            backgroundColor: 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="pricetag-outline"
            size={14}
            color={text.onPaper.primary}
          />
        </View>
        {inCart ? (
          <View
            style={{
              minWidth: 22,
              height: 22,
              paddingHorizontal: 6,
              borderRadius: 11,
              backgroundColor: surface.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 11,
                fontWeight: '900',
                letterSpacing: -0.2,
                fontVariant: ['tabular-nums'],
              }}
            >
              {quantity}
            </Text>
          </View>
        ) : null}
      </View>
      <View>
        <Text
          numberOfLines={2}
          style={{
            color: text.onPaper.primary,
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: -0.2,
            lineHeight: 16,
          }}
        >
          {product.name}
        </Text>
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: -0.4,
            marginTop: 6,
            fontVariant: ['tabular-nums'],
          }}
        >
          ${price.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const ProductTile = memo(ProductTileInner);

export const VrittPosProductGrid = memo(Component);
