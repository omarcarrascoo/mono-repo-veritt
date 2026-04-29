import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { ChainTone } from '@/lib/daily-chain-home';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';
import {
  hairline,
  navbar,
  palette,
  radius,
  stateOnInk,
  stateOnPaper,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

export type DetailMetric = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: 'hero' | 'ink' | 'paper';
  onPress?: () => void;
};

type VrittDetailBentoProps = {
  metrics: DetailMetric[];
  /** Se usa para acentuar la métrica hero con el color del estado del negocio. */
  tone?: ChainTone;
};

function HeroMetric({
  metric,
  tone,
}: {
  metric: DetailMetric;
  tone: ChainTone;
}) {
  const accent = stateOnInk[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={metric.onPress}
      style={{
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: surface.ink,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[palette.inkTinted, surface.ink, palette.inkDeep]}
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
        end={{ x: 0.2, y: 0.9 }}
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
          top: -70,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: accent.halo,
        }}
      />
      <VrittAbstractShapes tint={palette.paper} variant="compact" />

      <View style={{ padding: 22, gap: 18 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: withAlpha(palette.paper, 0.08),
              borderWidth: 1,
              borderColor: hairline.onInk,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={metric.icon}
              size={17}
              color={palette.paper}
            />
          </View>
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {metric.label}
          </Text>
        </View>

        <View>
          <Text
            numberOfLines={1}
            style={{
              color: palette.paper,
              fontSize: 42,
              fontWeight: '800',
              letterSpacing: -2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {metric.value}
          </Text>
          {metric.hint ? (
            <Text
              numberOfLines={1}
              style={{
                color: text.onInk.soft,
                fontSize: 12,
                fontWeight: '700',
                marginTop: 6,
                letterSpacing: -0.1,
              }}
            >
              {metric.hint}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SmallMetric({
  metric,
  tone,
}: {
  metric: DetailMetric;
  tone: ChainTone;
}) {
  const accent = stateOnPaper[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={metric.onPress}
      style={{
        flex: 1,
        padding: 16,
        borderRadius: radius.md,
        backgroundColor: surface.card,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        minHeight: 118,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Halo sutil del tono en la esquina */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: accent.halo,
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: accent.chipBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={metric.icon}
            size={14}
            color={accent.chipInk}
          />
        </View>
      </View>

      <View>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.primary,
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: -0.8,
            fontVariant: ['tabular-nums'],
          }}
        >
          {metric.value}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginTop: 5,
          }}
        >
          {metric.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function Component({ metrics, tone = 'start' }: VrittDetailBentoProps) {
  if (metrics.length === 0) return null;

  const [hero, ...rest] = metrics;
  const pairs: DetailMetric[][] = [];
  for (let i = 0; i < rest.length; i += 2) {
    pairs.push(rest.slice(i, i + 2));
  }

  return (
    <View style={{ gap: 12 }}>
      {hero ? <HeroMetric metric={hero} tone={tone} /> : null}
      {pairs.map((pair, idx) => (
        <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
          {pair.map((m) => (
            <SmallMetric key={m.key} metric={m} tone={tone} />
          ))}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export const VrittDetailBento = memo(Component);
