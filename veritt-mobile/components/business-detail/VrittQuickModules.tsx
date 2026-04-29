import React, { memo, useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { QuickModuleItem } from '@/lib/business-detail-builders';
import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

type VrittQuickModulesProps = {
  items: QuickModuleItem[];
  onNavigate: (route: string) => void;
};

const COLUMNS = 4;
const GAP = 10;

function Component({ items, onNavigate }: VrittQuickModulesProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth((prev) =>
      w > 0 && Math.abs(w - prev) > 0.5 ? w : prev,
    );
  }, []);

  if (items.length === 0) return null;

  const tileWidth =
    containerWidth > 0
      ? (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS
      : 0;

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
      }}
    >
      {items.map((m) => (
        <QuickTile
          key={m.key}
          item={m}
          width={tileWidth}
          onNavigate={onNavigate}
        />
      ))}
    </View>
  );
}

type QuickTileProps = {
  item: QuickModuleItem;
  width: number;
  onNavigate: (route: string) => void;
};

function QuickTileInner({ item, width, onNavigate }: QuickTileProps) {
  const handlePress = useCallback(
    () => onNavigate(item.route),
    [onNavigate, item.route],
  );

  if (width <= 0) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        width,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: radius.md,
        backgroundColor: surface.card,
        borderWidth: 1,
        borderColor: item.highlight
          ? 'rgba(11,14,18,0.18)'
          : hairline.onPaperSoft,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: item.highlight
            ? surface.ink
            : 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={item.icon}
          size={16}
          color={item.highlight ? text.onInk.primary : text.onPaper.primary}
        />
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: text.onPaper.primary,
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
}

const QuickTile = memo(QuickTileInner);

export const VrittQuickModules = memo(Component);
