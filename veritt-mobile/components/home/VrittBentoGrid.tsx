import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';

const PAPER = '#F5F2EA';

export type VrittBentoPalette = 'paper' | 'ink' | 'outline';
export type VrittBentoBadgeTone = 'neutral' | 'forest' | 'amber' | 'danger';

export type VrittBentoWidget = {
  key: string;
  kind: 'headline' | 'metric' | 'list' | 'cta';
  label: string;
  value?: string;
  sub?: string;
  badgeTone?: VrittBentoBadgeTone;
  bullets?: Array<{ label: string; value: string }>;
  icon?: keyof typeof Ionicons.glyphMap;
  palette: VrittBentoPalette;
  onPress: () => void;
};

type VrittBentoGridProps = {
  widgets: VrittBentoWidget[];
};

const PALETTES: Record<
  VrittBentoPalette,
  {
    bg: string;
    ink: string;
    muted: string;
    soft: string;
    divider: string;
    border: string;
    chipBgNeutral: string;
  }
> = {
  // Paper sobre paper: se diferencia con borde sutil.
  paper: {
    bg: '#FFFFFF',
    ink: '#0A0A0A',
    muted: 'rgba(10,10,10,0.55)',
    soft: 'rgba(10,10,10,0.42)',
    divider: 'rgba(10,10,10,0.08)',
    border: 'rgba(10,10,10,0.08)',
    chipBgNeutral: 'rgba(10,10,10,0.06)',
  },
  // Ink sobre paper: el contraste fuerte.
  ink: {
    bg: '#0B0E12',
    ink: '#F5F2EA',
    muted: 'rgba(245,242,234,0.5)',
    soft: 'rgba(245,242,234,0.38)',
    divider: 'rgba(245,242,234,0.06)',
    border: '#0B0E12',
    chipBgNeutral: 'rgba(107,122,143,0.18)',
  },
  // Outline sobre paper: solo borde, sin fondo.
  outline: {
    bg: 'transparent',
    ink: '#0A0A0A',
    muted: 'rgba(10,10,10,0.55)',
    soft: 'rgba(10,10,10,0.42)',
    divider: 'rgba(10,10,10,0.08)',
    border: 'rgba(10,10,10,0.12)',
    chipBgNeutral: 'rgba(10,10,10,0.06)',
  },
};

const BADGE_TONES_ON_LIGHT: Record<
  VrittBentoBadgeTone,
  { bg: string; ink: string }
> = {
  neutral: { bg: 'rgba(10,10,10,0.06)', ink: '#0A0A0A' },
  forest: { bg: 'rgba(74,124,89,0.14)', ink: '#1F3A2B' },
  amber: { bg: 'rgba(196,138,58,0.16)', ink: '#5E3F14' },
  danger: { bg: 'rgba(194,84,80,0.14)', ink: '#3D1312' },
};

const BADGE_TONES_ON_DARK: Record<
  VrittBentoBadgeTone,
  { bg: string; ink: string }
> = {
  neutral: { bg: 'rgba(245,242,234,0.08)', ink: '#F5F2EA' },
  forest: { bg: 'rgba(143,176,157,0.16)', ink: '#8FB09D' },
  amber: { bg: 'rgba(196,138,58,0.16)', ink: '#C48A3A' },
  danger: { bg: 'rgba(194,84,80,0.16)', ink: '#C25450' },
};

function pickBadge(palette: VrittBentoPalette, tone: VrittBentoBadgeTone) {
  return palette === 'ink'
    ? BADGE_TONES_ON_DARK[tone]
    : BADGE_TONES_ON_LIGHT[tone];
}

function Widget({ widget }: { widget: VrittBentoWidget }) {
  const p = PALETTES[widget.palette];
  const badgeTone = widget.badgeTone ?? 'neutral';
  const isInk = widget.palette === 'ink';

  if (widget.kind === 'headline') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={widget.onPress}
        style={{
          flex: 1,
          backgroundColor: p.bg,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: p.border,
          padding: 20,
          minHeight: 160,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {isInk ? <VrittAbstractShapes tint={PAPER} variant="wide" /> : null}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: p.muted,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {widget.label}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={p.muted} />
        </View>
        <View>
          <Text
            style={{
              color: p.ink,
              fontSize: 34,
              fontWeight: '900',
              letterSpacing: -1.4,
              lineHeight: 38,
              fontVariant: ['tabular-nums'],
            }}
          >
            {widget.value}
          </Text>
          {widget.sub ? (
            <Text
              style={{
                color: p.muted,
                fontSize: 12,
                marginTop: 8,
                lineHeight: 17,
              }}
            >
              {widget.sub}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  if (widget.kind === 'metric') {
    const badge = pickBadge(widget.palette, badgeTone);
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={widget.onPress}
        style={{
          flex: 1,
          backgroundColor: p.bg,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: p.border,
          padding: 16,
          minHeight: 148,
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {isInk ? <VrittAbstractShapes tint={PAPER} variant="compact" /> : null}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {widget.icon ? (
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                backgroundColor: p.chipBgNeutral,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={widget.icon} size={15} color={p.ink} />
            </View>
          ) : null}
          {widget.sub ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: badge.bg,
              }}
            >
              <Text
                style={{
                  color: badge.ink,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {widget.sub}
              </Text>
            </View>
          ) : null}
        </View>
        <View>
          <Text
            style={{
              color: p.ink,
              fontSize: 28,
              fontWeight: '900',
              letterSpacing: -1,
              fontVariant: ['tabular-nums'],
            }}
          >
            {widget.value}
          </Text>
          <Text
            style={{
              color: p.muted,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginTop: 3,
            }}
          >
            {widget.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (widget.kind === 'list') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={widget.onPress}
        style={{
          flex: 1,
          backgroundColor: p.bg,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: p.border,
          padding: 18,
          minHeight: 140,
          gap: 14,
          overflow: 'hidden',
        }}
      >
        {isInk ? <VrittAbstractShapes tint={PAPER} variant="wide" /> : null}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: p.muted,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {widget.label}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={p.muted} />
        </View>
        <View style={{ gap: 0 }}>
          {(widget.bullets ?? []).slice(0, 3).map((b, i, arr) => (
            <View
              key={`${widget.key}-b-${i}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 9,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: p.divider,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: p.ink,
                  fontSize: 13,
                  fontWeight: '600',
                  flex: 1,
                  marginRight: 8,
                }}
              >
                {b.label}
              </Text>
              <Text
                style={{
                  color: p.ink,
                  fontSize: 13,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {b.value}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={widget.onPress}
      style={{
        flex: 1,
        backgroundColor: p.bg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: p.border,
        padding: 18,
        minHeight: 140,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {isInk ? <VrittAbstractShapes tint={PAPER} variant="compact" /> : null}
      {widget.icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: p.chipBgNeutral,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={widget.icon} size={18} color={p.ink} />
        </View>
      ) : null}
      <View>
        <Text
          style={{
            color: p.ink,
            fontSize: 17,
            fontWeight: '800',
            letterSpacing: -0.3,
            lineHeight: 22,
          }}
        >
          {widget.label}
        </Text>
        {widget.sub ? (
          <Text
            style={{
              color: p.muted,
              fontSize: 12,
              marginTop: 6,
              lineHeight: 16,
            }}
          >
            {widget.sub}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function VrittBentoGrid({ widgets }: VrittBentoGridProps) {
  const a = widgets[0];
  const b = widgets[1];
  const c = widgets[2];
  const d = widgets[3];

  return (
    <View style={{ gap: 10 }}>
      {a ? (
        <View style={{ height: 168 }}>
          <Widget widget={a} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {b ? <Widget widget={b} /> : null}
        {c ? <Widget widget={c} /> : null}
      </View>
      {d ? (
        <View style={{ minHeight: 140 }}>
          <Widget widget={d} />
        </View>
      ) : null}
    </View>
  );
}
