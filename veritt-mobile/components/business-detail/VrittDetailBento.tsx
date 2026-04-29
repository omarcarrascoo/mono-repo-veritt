import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
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
};

const INK = surface.ink;
const CARD = surface.card;

function HeroMetric({ metric }: { metric: DetailMetric }) {
  const isInk = metric.variant === 'ink';
  const bg = isInk ? INK : CARD;
  const ink = isInk ? text.onInk.primary : text.onPaper.primary;
  const muted = isInk ? text.onInk.muted : text.onPaper.muted;
  const border = isInk ? 'transparent' : hairline.onPaper;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={metric.onPress}
      style={{
        padding: 20,
        borderRadius: radius.lg,
        backgroundColor: bg,
        borderWidth: isInk ? 0 : 1,
        borderColor: border,
        minHeight: 140,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.md,
            backgroundColor: isInk
              ? 'rgba(245,242,234,0.08)'
              : 'rgba(11,14,18,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={metric.icon} size={16} color={ink} />
        </View>
        <Text
          style={{
            color: muted,
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
            color: ink,
            fontSize: 30,
            fontWeight: '800',
            letterSpacing: -1.2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {metric.value}
        </Text>
        {metric.hint ? (
          <Text
            numberOfLines={1}
            style={{
              color: muted,
              fontSize: 11,
              fontWeight: '700',
              marginTop: 4,
              letterSpacing: -0.1,
            }}
          >
            {metric.hint}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SmallMetric({ metric }: { metric: DetailMetric }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={metric.onPress}
      style={{
        flex: 1,
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        minHeight: 98,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Ionicons
          name={metric.icon}
          size={14}
          color={text.onPaper.soft}
        />
        <Text
          numberOfLines={1}
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          {metric.label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          color: text.onPaper.primary,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.5,
          fontVariant: ['tabular-nums'],
        }}
      >
        {metric.value}
      </Text>
    </TouchableOpacity>
  );
}

function Component({ metrics }: VrittDetailBentoProps) {
  if (metrics.length === 0) return null;

  const [hero, ...rest] = metrics;
  const pairs: DetailMetric[][] = [];
  for (let i = 0; i < rest.length; i += 2) {
    pairs.push(rest.slice(i, i + 2));
  }

  return (
    <View style={{ gap: 10 }}>
      {hero ? <HeroMetric metric={hero} /> : null}
      {pairs.map((pair, idx) => (
        <View key={idx} style={{ flexDirection: 'row', gap: 10 }}>
          {pair.map((m) => (
            <SmallMetric key={m.key} metric={m} />
          ))}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export const VrittDetailBento = memo(Component);
