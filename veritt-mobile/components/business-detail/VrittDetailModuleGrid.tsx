import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

export type DetailModule = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type VrittDetailModuleGridProps = {
  title: string;
  eyebrow: string;
  modules: DetailModule[];
  columns?: 3 | 4;
};

function Component({
  title,
  eyebrow,
  modules,
  columns = 3,
}: VrittDetailModuleGridProps) {
  if (modules.length === 0) return null;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: -0.6,
            marginTop: 4,
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {modules.map((m) => (
          <ModuleTile key={m.key} module={m} columns={columns} />
        ))}
      </View>
    </View>
  );
}

function ModuleTile({
  module: m,
  columns,
}: {
  module: DetailModule;
  columns: 3 | 4;
}) {
  // gap=10 entre tiles; dividimos menos (columns-1)*10 / columns
  const basis =
    columns === 3 ? `${(100 - (2 * 10 * 100) / 320) / 3}%` : '23%';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={m.onPress}
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: columns === 3 ? '31.5%' : '23%',
        aspectRatio: 1,
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: surface.card,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm + 2,
          backgroundColor: 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={m.icon}
          size={18}
          color={text.onPaper.primary}
        />
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.2,
          lineHeight: 14,
        }}
      >
        {m.label}
      </Text>
    </TouchableOpacity>
  );
}

export const VrittDetailModuleGrid = memo(Component);
