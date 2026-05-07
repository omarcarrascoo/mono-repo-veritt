import React, { memo, useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

// ── VrittInventoryActionGrid ──────────────────────────────────────────
// Grid de acciones rápidas (3 cols por defecto). Pensado para "Agregar
// ubicación / insumo / producto".

export interface InventoryAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  highlight?: boolean;
}

interface VrittInventoryActionGridProps {
  items: InventoryAction[];
  columns?: number;
}

function Component({
  items,
  columns = 3,
}: VrittInventoryActionGridProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const gap = 10;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth((prev) =>
      w > 0 && Math.abs(w - prev) > 0.5 ? w : prev,
    );
  }, []);

  if (items.length === 0) return null;

  const tileWidth =
    containerWidth > 0
      ? (containerWidth - gap * (columns - 1)) / columns
      : 0;

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
      }}
    >
      {items.map((item) => (
        <ActionTile key={item.key} item={item} width={tileWidth} />
      ))}
    </View>
  );
}

const ActionTile = memo(function ActionTile({
  item,
  width,
}: {
  item: InventoryAction;
  width: number;
}) {
  const handlePress = useCallback(() => item.onPress(), [item]);
  if (width <= 0) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        width,
        paddingVertical: 22,
        paddingHorizontal: 12,
        borderRadius: radius.lg,
        backgroundColor: item.highlight ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: item.highlight
          ? 'rgba(11,14,18,0.85)'
          : hairline.onPaper,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: item.highlight
            ? 'rgba(245,242,234,0.14)'
            : 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={item.icon}
          size={17}
          color={item.highlight ? palette.paper : text.onPaper.primary}
        />
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: item.highlight ? palette.paper : text.onPaper.primary,
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: -0.1,
          textAlign: 'center',
        }}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
});

export const VrittInventoryActionGrid = memo(Component);
