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
import { formatLocationType } from '@/lib/inventory-formatters';
import type {
  InventoryLocation,
  InventoryLocationType,
} from '@/types/inventory.types';

// ── VrittLocationRow ──────────────────────────────────────────────────
// Card-row para una ubicación de inventario.

interface VrittLocationRowProps {
  location: InventoryLocation;
  onPress: (locationId: string) => void;
}

const TYPE_ICONS: Record<InventoryLocationType, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  MAIN: 'star-outline',
  WAREHOUSE: 'archive-outline',
  RESTAURANT: 'storefront-outline',
  KITCHEN: 'restaurant-outline',
  OTHER: 'location-outline',
};

function Component({ location, onPress }: VrittLocationRowProps) {
  const handlePress = useCallback(
    () => onPress(location.id),
    [location.id, onPress],
  );

  const isInactive = location.status !== 'ACTIVE';
  const icon = TYPE_ICONS[location.type] ?? 'location-outline';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: isInactive ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.sm + 2,
          backgroundColor: location.isPrimary
            ? withAlpha(palette.amber, 0.16)
            : 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            location.isPrimary
              ? palette.amberDeep
              : text.onPaper.primary
          }
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 14,
              fontWeight: '800',
              letterSpacing: -0.3,
              flexShrink: 1,
            }}
          >
            {location.name}
          </Text>
          {location.isPrimary ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: withAlpha(palette.amber, 0.16),
              }}
            >
              <Text
                style={{
                  color: palette.amberDeep,
                  fontSize: 9,
                  fontWeight: '900',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Principal
              </Text>
            </View>
          ) : null}
        </View>
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
          {formatLocationType(location.type)}
          {location.area ? ` · ${location.area.name}` : ''}
          {isInactive ? ' · Inactiva' : ''}
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

export const VrittLocationRow = memo(Component);
