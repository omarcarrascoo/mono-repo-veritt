import React, { memo } from 'react';
import {
  LayoutChangeEvent,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

export type QuickModule = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: boolean;
  onPress: () => void;
};

type VrittQuickModulesProps = {
  modules: QuickModule[];
};

const COLUMNS = 4;
const GAP = 10;

function Component({ modules }: VrittQuickModulesProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = React.useState(
    screenWidth - 36, // fallback = ancho pantalla menos padding horizontal (18*2)
  );

  if (modules.length === 0) return null;

  const tileWidth =
    (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 0.5) setContainerWidth(w);
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
      }}
    >
      {modules.map((m) => (
        <QuickTile key={m.key} module={m} width={tileWidth} />
      ))}
    </View>
  );
}

function QuickTile({
  module: m,
  width,
}: {
  module: QuickModule;
  width: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={m.onPress}
      style={{
        width,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: radius.md,
        backgroundColor: surface.card,
        borderWidth: 1,
        borderColor: m.highlight
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
          backgroundColor: m.highlight
            ? surface.ink
            : 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={m.icon}
          size={16}
          color={m.highlight ? text.onInk.primary : text.onPaper.primary}
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
        {m.label}
      </Text>
    </TouchableOpacity>
  );
}

export const VrittQuickModules = memo(Component);
