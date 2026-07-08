import React, { memo } from 'react';
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

// ── VrittInventoryFooterActions ──────────────────────────────────────
// Botones de acción en pie de pantalla (primary + secondary opcional +
// destructive opcional). Pensado para create/detail screens.

interface FooterAction {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
}

interface VrittInventoryFooterActionsProps {
  primary: FooterAction;
  secondary?: FooterAction;
  destructive?: FooterAction;
}

function Component({
  primary,
  secondary,
  destructive,
}: VrittInventoryFooterActionsProps) {
  return (
    <View style={{ gap: 10 }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={primary.onPress}
        disabled={primary.disabled || primary.loading}
        style={{
          backgroundColor: surface.ink,
          borderRadius: radius.md,
          paddingVertical: 16,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: primary.disabled ? 0.5 : 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}
        >
          {primary.icon ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: withAlpha(palette.paper, 0.12),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={primary.loading ? 'hourglass-outline' : primary.icon}
                size={14}
                color={palette.paper}
              />
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            style={{
              color: palette.paper,
              fontSize: 14,
              fontWeight: '900',
              letterSpacing: -0.2,
              flexShrink: 1,
            }}
          >
            {primary.loading ? 'Guardando…' : primary.label}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={palette.paper} />
      </TouchableOpacity>

      {secondary ? (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={secondary.onPress}
          disabled={secondary.disabled || secondary.loading}
          style={{
            backgroundColor: surface.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            paddingVertical: 13,
            alignItems: 'center',
            opacity: secondary.disabled ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {secondary.label}
          </Text>
        </TouchableOpacity>
      ) : null}

      {destructive ? (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={destructive.onPress}
          disabled={destructive.disabled}
          style={{
            paddingVertical: 13,
            alignItems: 'center',
            opacity: destructive.disabled ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              color: palette.danger,
              fontSize: 12,
              fontWeight: '900',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {destructive.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const VrittInventoryFooterActions = memo(Component);
