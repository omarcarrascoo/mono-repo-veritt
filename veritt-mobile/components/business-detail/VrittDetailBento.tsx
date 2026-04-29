import React, { memo, useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { ChainTone } from '@/lib/daily-chain-home';
import type { DetailMetricItem } from '@/lib/business-detail-builders';
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

type VrittDetailBentoProps = {
  items: DetailMetricItem[];
  tone: ChainTone;
  onNavigate: (route: string) => void;
};

// ── Métrica hero (ink) ──

type HeroMetricProps = {
  item: DetailMetricItem;
  tone: ChainTone;
  onNavigate: (route: string) => void;
};

function HeroMetricInner({ item, tone, onNavigate }: HeroMetricProps) {
  const accent = stateOnInk[tone];
  const handlePress = useCallback(
    () => onNavigate(item.route),
    [onNavigate, item.route],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
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
        style={StyleSheet_absolute}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[...navbar.steelOverlay]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.9 }}
        style={StyleSheet_absolute}
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
            <Ionicons name={item.icon} size={17} color={palette.paper} />
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
            {item.label}
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
            {item.value}
          </Text>
          {item.hint ? (
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
              {item.hint}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const HeroMetric = memo(HeroMetricInner);

// ── Métrica secundaria (paper con halo del tono) ──

type SmallMetricProps = {
  item: DetailMetricItem;
  tone: ChainTone;
  onNavigate: (route: string) => void;
};

function SmallMetricInner({ item, tone, onNavigate }: SmallMetricProps) {
  const accent = stateOnPaper[tone];
  const handlePress = useCallback(
    () => onNavigate(item.route),
    [onNavigate, item.route],
  );

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
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
          <Ionicons name={item.icon} size={14} color={accent.chipInk} />
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
          {item.value}
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
          {item.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const SmallMetric = memo(SmallMetricInner);

// ── Wrapper ──

function Component({ items, tone, onNavigate }: VrittDetailBentoProps) {
  const pairs = useMemo(() => {
    if (items.length <= 1) return [];
    const rest = items.slice(1);
    const out: DetailMetricItem[][] = [];
    for (let i = 0; i < rest.length; i += 2) out.push(rest.slice(i, i + 2));
    return out;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <HeroMetric item={items[0]} tone={tone} onNavigate={onNavigate} />
      {pairs.map((pair, idx) => (
        <View key={idx} style={{ flexDirection: 'row', gap: 12 }}>
          {pair.map((m) => (
            <SmallMetric
              key={m.key}
              item={m}
              tone={tone}
              onNavigate={onNavigate}
            />
          ))}
          {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export const VrittDetailBento = memo(Component);

// Estilo reutilizable para posiciones absolute full.
const StyleSheet_absolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
