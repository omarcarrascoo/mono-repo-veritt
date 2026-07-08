import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

// ── VrittInventoryEmpty ───────────────────────────────────────────────
// Estado vacío para listas dentro del módulo inventario.

interface VrittInventoryEmptyProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function Component({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: VrittInventoryEmptyProps) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingVertical: 28,
        paddingHorizontal: 22,
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: 'rgba(11,14,18,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={text.onPaper.primary} />
      </View>

      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 15,
          fontWeight: '800',
          letterSpacing: -0.3,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>

      {description ? (
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
            maxWidth: 280,
            fontWeight: '600',
          }}
        >
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.88}
          style={{
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: radius.sm + 2,
            backgroundColor: surface.ink,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="add" size={13} color={text.onInk.primary} />
          <Text
            style={{
              color: text.onInk.primary,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const VrittInventoryEmpty = memo(Component);
