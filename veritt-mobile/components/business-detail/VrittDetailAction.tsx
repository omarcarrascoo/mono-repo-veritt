import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { ChainTone } from '@/lib/daily-chain-home';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';
import {
  heroSkin,
  navbar,
  palette,
  radius,
  stateOnInk,
  text,
  withAlpha,
} from '@/constants/design-tokens';

type VrittDetailActionProps = {
  tone: ChainTone;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  stepCode: string;
  onPress: () => void;
};

function Component({
  tone,
  eyebrow,
  title,
  description,
  ctaLabel,
  stepCode,
  onPress,
}: VrittDetailActionProps) {
  const skin = heroSkin[tone];
  const accent = stateOnInk[tone];

  return (
    <View
      style={{
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: skin.bg,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[palette.inkTinted, skin.bg, palette.inkDeep]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[...navbar.steelOverlay]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.15, y: 0.9 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -90,
          right: -70,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: accent.halo,
        }}
      />
      <VrittAbstractShapes tint={palette.paper} variant="hero" />

      <View style={{ padding: 24 }}>
        {/* Eyebrow */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
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
            numberOfLines={1}
            style={{
              color: accent.chipInk,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            {eyebrow}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {stepCode}
          </Text>
        </View>

        {/* Title */}
        <Text
          numberOfLines={3}
          style={{
            color: palette.paper,
            fontSize: 32,
            fontWeight: '800',
            letterSpacing: -1.4,
            lineHeight: 36,
            marginTop: 16,
          }}
        >
          {title}
        </Text>

        {/* Description */}
        <Text
          numberOfLines={3}
          style={{
            color: text.onInk.soft,
            fontSize: 14,
            lineHeight: 21,
            marginTop: 12,
          }}
        >
          {description}
        </Text>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPress}
          style={{
            marginTop: 22,
            backgroundColor: palette.paper,
            borderRadius: radius.md,
            paddingVertical: 16,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: palette.ink,
              fontSize: 15,
              fontWeight: '900',
              letterSpacing: -0.2,
            }}
          >
            {ctaLabel}
          </Text>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: palette.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-forward" size={15} color={palette.paper} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Secondary action — ver cadena */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: withAlpha(palette.paper, 0.08),
          paddingHorizontal: 24,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="layers-outline" size={13} color={text.onInk.muted} />
        <Text
          style={{
            color: text.onInk.muted,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          Cadena operativa
        </Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={text.onInk.muted}
        />
      </View>
    </View>
  );
}

export const VrittDetailAction = memo(Component);
