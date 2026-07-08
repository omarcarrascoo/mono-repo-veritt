import React, { memo, useCallback } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  hairline,
  radius,
  text,
} from '@/constants/design-tokens';

// ── VrittScreenHeader ─────────────────────────────────────────────────
// Header consistente para pantallas paper: back + eyebrow + title.
// Usa safe-area insets en lugar de hardcoded 60/52.

interface VrittScreenHeaderProps {
  eyebrow: string;
  title: string;
  onBack?: () => void;
  /** Acción a la derecha (botón "+", refresh, etc.). */
  rightSlot?: React.ReactNode;
  /** Si quieres ocultar el botón de back (e.g. screens de tab raíz). */
  hideBack?: boolean;
}

const FALLBACK_TOP = Platform.OS === 'ios' ? 12 : 16;

function Component({
  eyebrow,
  title,
  onBack,
  rightSlot,
  hideBack,
}: VrittScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const handleBack = useCallback(() => onBack?.(), [onBack]);

  return (
    <View
      style={{
        paddingTop: Math.max(insets.top, FALLBACK_TOP) + 8,
        paddingHorizontal: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: hairline.onPaperSoft,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        {!hideBack && onBack ? (
          <Pressable
            onPress={handleBack}
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
              textTransform: 'capitalize',
            }}
          >
            {title}
          </Text>
        </View>

        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

export const VrittScreenHeader = memo(Component);
