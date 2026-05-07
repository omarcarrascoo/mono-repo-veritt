import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette, radius, text } from '@/constants/design-tokens';

interface VrittInventorySectionHeaderProps {
  eyebrow: string;
  title: string;
  trailing?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
}

function Component({
  eyebrow,
  title,
  trailing,
  onAction,
  actionLabel,
  actionIcon = 'add',
}: VrittInventorySectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 4,
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 4,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.8,
              flex: 1,
            }}
          >
            {title}
          </Text>
          {trailing ? (
            <Text
              style={{
                color: text.onPaper.subtle,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                fontVariant: ['tabular-nums'],
              }}
            >
              {trailing}
            </Text>
          ) : null}
        </View>
      </View>

      {onAction && actionLabel ? (
        <Pressable
          onPress={onAction}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: radius.pill,
            backgroundColor: 'rgba(11,14,18,0.05)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ionicons
            name={actionIcon}
            size={12}
            color={text.onPaper.primary}
          />
          <Text
            style={{
              color: palette.ink,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: -0.1,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const VrittInventorySectionHeader = memo(Component);
