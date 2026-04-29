import React, { memo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ChainTone } from '@/lib/daily-chain-home';
import {
  hairline,
  radius,
  stateOnPaper,
  surface,
  text,
} from '@/constants/design-tokens';

type VrittDetailHeaderProps = {
  name: string;
  tone: ChainTone;
  stageLabel: string;
  onBack: () => void;
  onMore?: () => void;
};

function Component({
  name,
  tone,
  stageLabel,
  onBack,
  onMore,
}: VrittDetailHeaderProps) {
  const accent = stateOnPaper[tone];

  return (
    <View
      style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 52,
        paddingHorizontal: 18,
        paddingBottom: 14,
        backgroundColor: surface.paper,
        borderBottomWidth: 1,
        borderBottomColor: hairline.onPaperSoft,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Pressable
          onPress={onBack}
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

        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.primary,
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
            }}
          >
            {name}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: radius.sm,
            backgroundColor: accent.chipBg,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: accent.accent,
            }}
          />
          <Text
            style={{
              color: accent.chipInk,
              fontSize: 9,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {stageLabel}
          </Text>
        </View>

        {onMore ? (
          <Pressable
            onPress={onMore}
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
              name="ellipsis-horizontal"
              size={16}
              color={text.onPaper.primary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const VrittDetailHeader = memo(Component);
