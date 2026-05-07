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
  calcReceiptTotal,
  shortTime,
} from '@/lib/receipts-formatters';
import { formatInventoryCurrency } from '@/lib/inventory-formatters';
import type { Receipt } from '@/types/receipt.types';

import { VrittReceiptStatusChip } from '@/components/receipts/VrittReceiptStatusChip';

// ── VrittReceiptRow ──────────────────────────────────────────────────
// Card-row para la lista de recepciones. Muestra OC, proveedor, items,
// total y status.

interface VrittReceiptRowProps {
  receipt: Receipt;
  currency: string;
  onPress: (receiptId: string) => void;
}

function Component({ receipt, currency, onPress }: VrittReceiptRowProps) {
  const handlePress = useCallback(
    () => onPress(receipt.id),
    [receipt.id, onPress],
  );

  const supplierName =
    receipt.purchaseOrder?.supplier?.name ?? 'Recepción directa';
  const orderLabel = receipt.purchaseOrder
    ? `OC-${receipt.purchaseOrder.orderNumber}`
    : 'Sin orden';
  const itemCount = receipt.items?.length ?? 0;
  const total = calcReceiptTotal(receipt.items ?? []);
  const isCancelled = receipt.status === 'CANCELLED';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 22,
        gap: 18,
        opacity: isCancelled ? 0.7 : 1,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.sm + 4,
            backgroundColor: receipt.purchaseOrder
              ? withAlpha(palette.forest, 0.14)
              : 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={receipt.purchaseOrder ? 'archive' : 'cube-outline'}
            size={17}
            color={
              receipt.purchaseOrder
                ? palette.forestDeep
                : text.onPaper.primary
            }
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '900',
                letterSpacing: -0.3,
                flexShrink: 1,
              }}
            >
              {orderLabel}
            </Text>
            {receipt.receivedAt ? (
              <>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: text.onPaper.subtle,
                  }}
                />
                <Text
                  style={{
                    color: text.onPaper.muted,
                    fontSize: 11,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {shortTime(receipt.receivedAt)}
                </Text>
              </>
            ) : null}
          </View>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: -0.1,
              marginTop: 4,
            }}
          >
            {supplierName}
            {receipt.location?.name ? ` · ${receipt.location.name}` : ''}
          </Text>
        </View>

        <VrittReceiptStatusChip status={receipt.status} size="sm" />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: hairline.onPaperSoft,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons
            name="cube-outline"
            size={11}
            color={text.onPaper.muted}
          />
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.4,
              fontVariant: ['tabular-nums'],
            }}
          >
            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
          </Text>
        </View>
        <Text
          style={{
            color: isCancelled ? text.onPaper.subtle : text.onPaper.primary,
            fontSize: 15,
            fontWeight: '900',
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
            textDecorationLine: isCancelled ? 'line-through' : 'none',
          }}
        >
          {formatInventoryCurrency(total, currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export const VrittReceiptRow = memo(Component);
