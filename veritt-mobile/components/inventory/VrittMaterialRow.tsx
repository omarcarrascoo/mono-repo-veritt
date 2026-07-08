import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';
import {
  formatInventoryCurrency,
  formatInventoryQuantity,
  getStockHealth,
} from '@/lib/inventory-formatters';
import type { Material } from '@/types/inventory.types';

import {
  VrittStockBar,
  VrittStockChip,
} from '@/components/inventory/VrittStockTone';

interface VrittMaterialRowProps {
  material: Material;
  currency: string;
  onPress: (materialId: string) => void;
}

function Component({
  material,
  currency,
  onPress,
}: VrittMaterialRowProps) {
  const handlePress = useCallback(
    () => onPress(material.id),
    [material.id, onPress],
  );

  const health = getStockHealth(material.currentStock, material.minStock);
  const isInactive = material.status !== 'ACTIVE';

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
            backgroundColor: 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="cube-outline"
            size={17}
            color={text.onPaper.primary}
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
            {material.name}
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
            {material.category || 'Sin categoría'} · {material.baseUnit}
            {material.sku ? ` · ${material.sku}` : ''}
          </Text>
        </View>

        <VrittStockChip tone={health.tone} label={health.label} size="sm" />
      </View>

      <VrittStockBar tone={health.tone} ratio={health.ratio} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            Stock
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 13,
              fontWeight: '900',
              letterSpacing: -0.2,
              marginTop: 3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatInventoryQuantity(material.currentStock, material.baseUnit)}
            <Text
              style={{
                color: text.onPaper.muted,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {' '}
              / mín {formatInventoryQuantity(material.minStock, material.baseUnit)}
            </Text>
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            Costo
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 13,
              fontWeight: '900',
              letterSpacing: -0.2,
              marginTop: 3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatInventoryCurrency(
              material.currentReferenceUnitCost,
              currency,
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const VrittMaterialRow = memo(Component);
