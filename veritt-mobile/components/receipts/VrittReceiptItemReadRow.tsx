import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  text,
} from '@/constants/design-tokens';
import { formatInventoryCurrency } from '@/lib/inventory-formatters';
import type { ReceiptItem } from '@/types/receipt.types';

// ── VrittReceiptItemReadRow ──────────────────────────────────────────
// Renglón read-only de un item recibido — usado en la pantalla detail.

interface VrittReceiptItemReadRowProps {
  item: ReceiptItem;
  currency: string;
  isFirst: boolean;
}

function Component({ item, currency, isFirst }: VrittReceiptItemReadRowProps) {
  const qty = Number(item.quantityReceived);
  const cost = Number(item.actualUnitCost);
  const total = qty * cost;
  const unit = item.material?.unit ?? '';
  const name = item.material?.name ?? 'Material';

  return (
    <View
      style={{
        paddingHorizontal: 22,
        paddingVertical: 18,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: hairline.onPaperSoft,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="cube-outline" size={15} color={text.onPaper.primary} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.4,
            fontVariant: ['tabular-nums'],
          }}
        >
          {qty} {unit} · {formatInventoryCurrency(cost, currency)} c/u
        </Text>
      </View>

      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 14,
          fontWeight: '900',
          letterSpacing: -0.3,
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatInventoryCurrency(total, currency)}
      </Text>
    </View>
  );
}

export const VrittReceiptItemReadRow = memo(Component);
