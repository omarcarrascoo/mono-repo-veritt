import React, { memo } from 'react';
import { Text, View } from 'react-native';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import { formatInventoryCurrency } from '@/lib/inventory-formatters';

// ── VrittCostBreakdown ────────────────────────────────────────────────
// Tabla compacta con desglose materia/mano/cif y total destacado.

interface CostRow {
  label: string;
  value: number | string;
}

interface VrittCostBreakdownProps {
  rows: CostRow[];
  total: number | string;
  currency: string;
  totalLabel?: string;
}

function Component({
  rows,
  total,
  currency,
  totalLabel = 'Costo total',
}: VrittCostBreakdownProps) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        overflow: 'hidden',
      }}
    >
      {rows.map((row, idx) => (
        <View
          key={`${row.label}-${idx}`}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopWidth: idx === 0 ? 0 : 1,
            borderTopColor: hairline.onPaperSoft,
          }}
        >
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: -0.1,
            }}
          >
            {row.label}
          </Text>
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 13,
              fontWeight: '800',
              letterSpacing: -0.2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatInventoryCurrency(row.value, currency)}
          </Text>
        </View>
      ))}

      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: withAlpha(palette.ink, 0.04),
          borderTopWidth: 1,
          borderTopColor: hairline.onPaper,
        }}
      >
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {totalLabel}
        </Text>
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 17,
            fontWeight: '900',
            letterSpacing: -0.5,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatInventoryCurrency(total, currency)}
        </Text>
      </View>
    </View>
  );
}

export const VrittCostBreakdown = memo(Component);
