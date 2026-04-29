import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChainTone } from '@/lib/daily-chain-home';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';

const PAPER = '#F5F2EA';

export type VrittNextMoveSkin = 'hero' | 'ink' | 'paper' | 'outline';

export type VrittNextMoveItem = {
  key: string;
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  skin: VrittNextMoveSkin;
  onPress: () => void;
};

type VrittNextMoveProps = {
  tone: ChainTone;
  items: VrittNextMoveItem[];
};

// Hero skin: matiz según etapa (igual lenguaje que el StageMega).
type HeroSkin = {
  bg: string;
  ink: string;
  muted: string;
  iconBg: string;
  iconInk: string;
  arrowBg: string;
  arrowInk: string;
  eyebrowDot: string;
  eyebrowText: string;
};

const HERO_BY_TONE: Record<ChainTone, HeroSkin> = {
  start: {
    bg: '#0B0E12',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.6)',
    iconBg: 'rgba(107,122,143,0.18)',
    iconInk: '#F5F2EA',
    arrowBg: '#F5F2EA',
    arrowInk: '#0B0E12',
    eyebrowDot: '#F5F2EA',
    eyebrowText: '#F5F2EA',
  },
  progress: {
    bg: '#0B0E12',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.6)',
    iconBg: 'rgba(143,176,157,0.16)',
    iconInk: '#8FB09D',
    arrowBg: '#F5F2EA',
    arrowInk: '#0B0E12',
    eyebrowDot: '#8FB09D',
    eyebrowText: '#8FB09D',
  },
  review: {
    bg: '#100A03',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.62)',
    iconBg: 'rgba(196,138,58,0.2)',
    iconInk: '#C48A3A',
    arrowBg: '#C48A3A',
    arrowInk: '#1A0F03',
    eyebrowDot: '#C48A3A',
    eyebrowText: '#C48A3A',
  },
  blocker: {
    bg: '#100404',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.6)',
    iconBg: 'rgba(194,84,80,0.2)',
    iconInk: '#C25450',
    arrowBg: '#C25450',
    arrowInk: '#2A0606',
    eyebrowDot: '#C25450',
    eyebrowText: '#C25450',
  },
  done: {
    bg: '#06120C',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.66)',
    iconBg: 'rgba(74,124,89,0.22)',
    iconInk: '#8FB09D',
    arrowBg: '#4A7C59',
    arrowInk: '#F5F2EA',
    eyebrowDot: '#8FB09D',
    eyebrowText: '#8FB09D',
  },
};

type FlatSkin = {
  bg: string;
  ink: string;
  muted: string;
  iconBg: string;
  iconInk: string;
  arrowBg: string;
  arrowInk: string;
  border: string;
};

const FLAT_SKINS: Record<Exclude<VrittNextMoveSkin, 'hero'>, FlatSkin> = {
  ink: {
    bg: '#0B0E12',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.55)',
    iconBg: 'rgba(107,122,143,0.18)',
    iconInk: '#F5F2EA',
    arrowBg: 'rgba(107,122,143,0.22)',
    arrowInk: '#F5F2EA',
    border: 'transparent',
  },
  paper: {
    bg: '#FFFFFF',
    ink: '#0A0A0A',
    muted: 'rgba(10,10,10,0.55)',
    iconBg: 'rgba(10,10,10,0.06)',
    iconInk: '#0A0A0A',
    arrowBg: 'rgba(10,10,10,0.06)',
    arrowInk: '#0A0A0A',
    border: 'rgba(10,10,10,0.08)',
  },
  outline: {
    bg: 'transparent',
    ink: '#0A0A0A',
    muted: 'rgba(10,10,10,0.55)',
    iconBg: 'rgba(10,10,10,0.04)',
    iconInk: '#0A0A0A',
    arrowBg: 'rgba(10,10,10,0.04)',
    arrowInk: '#0A0A0A',
    border: 'rgba(10,10,10,0.12)',
  },
};

function Item({
  item,
  tone,
  isFirst,
}: {
  item: VrittNextMoveItem;
  tone: ChainTone;
  isFirst: boolean;
}) {
  if (item.skin === 'hero') {
    const s = HERO_BY_TONE[tone];
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={item.onPress}
        style={{
          backgroundColor: s.bg,
          borderRadius: 22,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        <VrittAbstractShapes tint={PAPER} variant="compact" />
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: s.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={item.icon} size={24} color={s.iconInk} />
        </View>

        <View style={{ flex: 1 }}>
          {isFirst ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: s.eyebrowDot,
                }}
              />
              <Text
                style={{
                  color: s.eyebrowText,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                Sugerido ahora
              </Text>
            </View>
          ) : null}
          <Text
            style={{
              color: s.ink,
              fontSize: 22,
              fontWeight: '900',
              letterSpacing: -0.7,
              lineHeight: 26,
            }}
          >
            {item.label}
          </Text>
          {item.hint ? (
            <Text
              style={{
                color: s.muted,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 16,
              }}
              numberOfLines={1}
            >
              {item.hint}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: s.arrowBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-forward" size={24} color={s.arrowInk} />
        </View>
      </TouchableOpacity>
    );
  }

  const s = FLAT_SKINS[item.skin];
  const isInk = item.skin === 'ink';
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={item.onPress}
      style={{
        backgroundColor: s.bg,
        borderRadius: 22,
        borderWidth: s.border === 'transparent' ? 0 : 1,
        borderColor: s.border,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        overflow: 'hidden',
      }}
    >
      {isInk ? <VrittAbstractShapes tint={PAPER} variant="compact" /> : null}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: s.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={item.icon} size={24} color={s.iconInk} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: s.ink,
            fontSize: 20,
            fontWeight: '900',
            letterSpacing: -0.6,
            lineHeight: 24,
          }}
        >
          {item.label}
        </Text>
        {item.hint ? (
          <Text
            style={{
              color: s.muted,
              fontSize: 12,
              marginTop: 4,
              lineHeight: 16,
            }}
            numberOfLines={1}
          >
            {item.hint}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: s.arrowBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-forward" size={22} color={s.arrowInk} />
      </View>
    </TouchableOpacity>
  );
}

export function VrittNextMove({ tone, items }: VrittNextMoveProps) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ paddingHorizontal: 4, marginBottom: 2 }}>
        <Text
          style={{
            color: 'rgba(10,10,10,0.45)',
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          Tus próximos movimientos
        </Text>
      </View>

      {items.map((item, idx) => (
        <Item
          key={item.key}
          item={item}
          tone={tone}
          isFirst={idx === 0}
        />
      ))}
    </View>
  );
}
