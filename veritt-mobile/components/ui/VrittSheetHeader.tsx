import React, { memo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { hairline, text } from '@/constants/design-tokens';

// ── VrittSheetHeader ──────────────────────────────────────────────────
// Header para Modals presentados en pageSheet: drag handle + eyebrow +
// title + close. Misma anatomía en counter, review, confirm, reject.

interface VrittSheetHeaderProps {
  title: string;
  eyebrow: string;
  onClose: () => void;
}

function Component({ title, eyebrow, onClose }: VrittSheetHeaderProps) {
  return (
    <View
      style={{
        paddingTop: Platform.OS === 'ios' ? 14 : 18,
        paddingBottom: 14,
        paddingHorizontal: 22,
        borderBottomWidth: 1,
        borderBottomColor: hairline.onPaperSoft,
      }}
    >
      <View
        style={{
          alignSelf: 'center',
          width: 44,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(11,14,18,0.12)',
          marginBottom: 14,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.8,
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
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.6,
              marginTop: 4,
            }}
          >
            {title}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          hitSlop={6}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: hairline.onPaper,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={18} color={text.onPaper.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export const VrittSheetHeader = memo(Component);
