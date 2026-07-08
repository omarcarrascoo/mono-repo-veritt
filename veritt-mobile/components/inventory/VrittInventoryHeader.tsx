import React, { memo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

// ── VrittInventoryHeader ──────────────────────────────────────────────
// Header paper consistente para el módulo inventario. Acepta eyebrow,
// título, slot de acción derecho (e.g. "+ Nuevo") y botón back.

interface VrittInventoryHeaderProps {
  eyebrow: string;
  title: string;
  onBack?: () => void;
  rightAction?: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

function Component({
  eyebrow,
  title,
  onBack,
  rightAction,
}: VrittInventoryHeaderProps) {
  return (
    <View
      style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 52,
        paddingHorizontal: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: hairline.onPaperSoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={6}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.sm + 2,
              borderWidth: 1,
              borderColor: hairline.onPaper,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name="arrow-back"
              size={16}
              color={text.onPaper.primary}
            />
          </Pressable>
        ) : null}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: text.onPaper.primary,
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            {title}
          </Text>
        </View>

        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: radius.sm + 2,
              backgroundColor: surface.ink,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {rightAction.icon ? (
              <Ionicons
                name={rightAction.icon}
                size={14}
                color={text.onInk.primary}
              />
            ) : null}
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 12,
                fontWeight: '900',
                letterSpacing: -0.2,
              }}
            >
              {rightAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const VrittInventoryHeader = memo(Component);
