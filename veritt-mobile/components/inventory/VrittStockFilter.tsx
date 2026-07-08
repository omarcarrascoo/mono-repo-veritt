import React, { memo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import { stockSkin } from '@/components/inventory/VrittStockTone';
import type { StockTone } from '@/lib/inventory-formatters';

// ── VrittStockFilter ──────────────────────────────────────────────────
// Tabs scrollables horizontales para filtrar inventario por estado.

export type StockFilterValue = 'all' | StockTone;

interface FilterOption {
  key: StockFilterValue;
  label: string;
  count: number;
}

interface VrittStockFilterProps {
  options: FilterOption[];
  selected: StockFilterValue;
  onSelect: (key: StockFilterValue) => void;
}

function Component({ options, selected, onSelect }: VrittStockFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 2,
        paddingHorizontal: 4,
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.key === selected;
        const skin =
          opt.key === 'all' ? null : stockSkin(opt.key as StockTone);

        const bg = isSelected
          ? skin
            ? skin.bg
            : surface.ink
          : surface.card;
        const border = isSelected
          ? skin
            ? withAlpha(skin.dot, 0.45)
            : withAlpha(palette.ink, 0.85)
          : hairline.onPaper;
        const labelColor = isSelected
          ? skin
            ? skin.ink
            : text.onInk.primary
          : text.onPaper.primary;

        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.88}
            onPress={() => onSelect(opt.key)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: radius.pill,
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {skin ? (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: skin.dot,
                }}
              />
            ) : null}
            <Text
              style={{
                color: labelColor,
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: -0.1,
              }}
            >
              {opt.label}
            </Text>
            <View
              style={{
                minWidth: 20,
                paddingHorizontal: 6,
                height: 18,
                borderRadius: 9,
                backgroundColor: isSelected
                  ? withAlpha(palette.paper, skin ? 0 : 0.18)
                  : 'rgba(11,14,18,0.06)',
                borderWidth: isSelected && skin ? 1 : 0,
                borderColor: isSelected && skin ? skin.dot : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: labelColor,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: -0.1,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {opt.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const VrittStockFilter = memo(Component);
