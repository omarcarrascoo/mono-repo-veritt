import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { palette, radius, withAlpha } from '@/constants/design-tokens';
import type { StockTone } from '@/lib/inventory-formatters';

// ── VrittStockChip ────────────────────────────────────────────────────
// Chip pequeño que comunica salud del stock. Tonos:
//   ok    → forest
//   low   → amber
//   out   → danger

export interface StockChipSkin {
  bg: string;
  ink: string;
  dot: string;
}

export function stockSkin(tone: StockTone): StockChipSkin {
  switch (tone) {
    case 'out':
      return {
        bg: withAlpha(palette.danger, 0.16),
        ink: palette.dangerDeep,
        dot: palette.danger,
      };
    case 'low':
      return {
        bg: withAlpha(palette.amber, 0.16),
        ink: palette.amberDeep,
        dot: palette.amber,
      };
    case 'ok':
    default:
      return {
        bg: withAlpha(palette.forest, 0.14),
        ink: palette.forestDeep,
        dot: palette.forest,
      };
  }
}

interface VrittStockChipProps {
  tone: StockTone;
  label: string;
  size?: 'sm' | 'md';
}

function ChipComponent({ tone, label, size = 'md' }: VrittStockChipProps) {
  const skin = stockSkin(tone);
  const isSm = size === 'sm';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: isSm ? 8 : 10,
        paddingVertical: isSm ? 4 : 5,
        borderRadius: radius.pill,
        backgroundColor: skin.bg,
      }}
    >
      <View
        style={{
          width: isSm ? 5 : 6,
          height: isSm ? 5 : 6,
          borderRadius: 3,
          backgroundColor: skin.dot,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          color: skin.ink,
          fontSize: isSm ? 9 : 10,
          fontWeight: '900',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export const VrittStockChip = memo(ChipComponent);

// ── VrittStockBar ─────────────────────────────────────────────────────
// Barra horizontal que muestra ratio actual/mínimo (cap 1).

interface VrittStockBarProps {
  tone: StockTone;
  ratio: number;
  height?: number;
}

function BarComponent({ tone, ratio, height = 5 }: VrittStockBarProps) {
  const skin = stockSkin(tone);
  const safeRatio = Math.max(0, Math.min(1, ratio));
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: 'rgba(11,14,18,0.06)',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.max(safeRatio === 0 ? 0 : 6, safeRatio * 100)}%`,
          height: '100%',
          backgroundColor: skin.dot,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

export const VrittStockBar = memo(BarComponent);
