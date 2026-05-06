import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Sale } from '@/types/sale.types';
import {
  hairline,
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

type VrittSaleRowProps = {
  sale: Sale;
  onPress: (saleId: string) => void;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Component({ sale, onPress }: VrittSaleRowProps) {
  const handlePress = useCallback(() => onPress(sale.id), [onPress, sale.id]);

  const isCancelled = sale.status === 'CANCELLED';
  const timeLabel = sale.completedAt
    ? formatTime(sale.completedAt)
    : sale.createdAt
    ? formatTime(sale.createdAt)
    : '—';

  const operatorName = sale.operator?.fullName ?? 'Operador';
  const areaName = sale.area?.name;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Sello del ticket — ink cuadrado */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.sm + 2,
          backgroundColor: isCancelled
            ? 'rgba(194,84,80,0.1)'
            : surface.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: isCancelled ? palette.danger : text.onInk.primary,
            fontSize: 11,
            fontWeight: '900',
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          #{sale.saleNumber}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {timeLabel}
          </Text>
          {isCancelled ? (
            <>
              <Text style={{ color: text.onPaper.subtle, fontSize: 10 }}>·</Text>
              <Text
                style={{
                  color: palette.danger,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                Cancelada
              </Text>
            </>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
            marginTop: 2,
          }}
        >
          {operatorName}
          {areaName ? ` · ${areaName}` : ''}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            color: isCancelled
              ? text.onPaper.subtle
              : text.onPaper.primary,
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: -0.3,
            fontVariant: ['tabular-nums'],
            textDecorationLine: isCancelled ? 'line-through' : 'none',
          }}
        >
          ${Number(sale.total).toFixed(2)}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={15}
        color={text.onPaper.subtle}
      />
    </TouchableOpacity>
  );
}

export const VrittSaleRow = memo(Component);
