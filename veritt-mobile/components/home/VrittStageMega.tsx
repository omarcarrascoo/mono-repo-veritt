import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChainTone, DailyChainMoment } from '@/lib/daily-chain-home';
import { STAGE_ACCENTS } from '@/lib/stage-tokens';

type VrittStageMegaProps = {
  moment: DailyChainMoment;
  stepNumber: number;
  dateLabel: string;
  onPressCta: () => void;
  onPressDetail: () => void;
};

// Cada etapa tiene un "negro tintado": el fondo sigue siendo casi ink puro,
// pero lleva un matiz imperceptible del tono. El color puro aparece solo en
// el número grande, el chip y el CTA.
type HeroSkin = {
  bg: string;
  bgGlow: string;
  glowSize: number;
  glowOffset: number;
  divider: string;
  bodyMuted: string;
  bodySoft: string;
  chipBg: string;
  chipInk: string;
  bigNumber: string;
  cta: string;
  ctaInk: string;
  detailBtn: string;
  detailBtnInk: string;
};

const HERO_SKINS: Record<ChainTone, HeroSkin> = {
  start: {
    bg: '#0A0A0A',
    bgGlow: 'rgba(245,242,234,0.05)',
    glowSize: 320,
    glowOffset: -140,
    divider: 'rgba(245,242,234,0.08)',
    bodyMuted: 'rgba(245,242,234,0.56)',
    bodySoft: 'rgba(245,242,234,0.42)',
    chipBg: 'rgba(245,242,234,0.1)',
    chipInk: '#F5F2EA',
    bigNumber: '#F5F2EA',
    cta: '#F5F2EA',
    ctaInk: '#0A0A0A',
    detailBtn: 'rgba(245,242,234,0.06)',
    detailBtnInk: '#F5F2EA',
  },
  progress: {
    bg: '#0B0E12',
    bgGlow: 'rgba(107,122,143,0.18)',
    glowSize: 340,
    glowOffset: -150,
    divider: 'rgba(143,176,157,0.1)',
    bodyMuted: 'rgba(245,242,234,0.58)',
    bodySoft: 'rgba(245,242,234,0.42)',
    chipBg: 'rgba(143,176,157,0.14)',
    chipInk: '#8FB09D',
    bigNumber: '#8FB09D',
    cta: '#F5F2EA',
    ctaInk: '#0A0A0A',
    detailBtn: 'rgba(143,176,157,0.08)',
    detailBtnInk: '#8FB09D',
  },
  review: {
    bg: '#100A03',
    bgGlow: 'rgba(196,138,58,0.2)',
    glowSize: 340,
    glowOffset: -150,
    divider: 'rgba(196,138,58,0.14)',
    bodyMuted: 'rgba(245,242,234,0.6)',
    bodySoft: 'rgba(245,242,234,0.42)',
    chipBg: 'rgba(196,138,58,0.18)',
    chipInk: '#C48A3A',
    bigNumber: '#C48A3A',
    cta: '#C48A3A',
    ctaInk: '#1A0F03',
    detailBtn: 'rgba(196,138,58,0.1)',
    detailBtnInk: '#C48A3A',
  },
  blocker: {
    bg: '#100404',
    bgGlow: 'rgba(194,84,80,0.22)',
    glowSize: 340,
    glowOffset: -150,
    divider: 'rgba(194,84,80,0.14)',
    bodyMuted: 'rgba(245,242,234,0.6)',
    bodySoft: 'rgba(245,242,234,0.42)',
    chipBg: 'rgba(194,84,80,0.2)',
    chipInk: '#C25450',
    bigNumber: '#C25450',
    cta: '#C25450',
    ctaInk: '#2A0606',
    detailBtn: 'rgba(194,84,80,0.12)',
    detailBtnInk: '#C25450',
  },
  done: {
    bg: '#06120C',
    bgGlow: 'rgba(74,124,89,0.22)',
    glowSize: 360,
    glowOffset: -160,
    divider: 'rgba(74,124,89,0.16)',
    bodyMuted: 'rgba(245,242,234,0.66)',
    bodySoft: 'rgba(245,242,234,0.46)',
    chipBg: 'rgba(74,124,89,0.22)',
    chipInk: '#8FB09D',
    bigNumber: '#8FB09D',
    cta: '#4A7C59',
    ctaInk: '#F5F2EA',
    detailBtn: 'rgba(74,124,89,0.14)',
    detailBtnInk: '#8FB09D',
  },
};

const PAPER = '#F5F2EA';

export function VrittStageMega({
  moment,
  stepNumber,
  dateLabel,
  onPressCta,
  onPressDetail,
}: VrittStageMegaProps) {
  const a = STAGE_ACCENTS[moment.tone];
  const s = HERO_SKINS[moment.tone];

  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: s.glowOffset,
          right: s.glowOffset,
          width: s.glowSize,
          height: s.glowSize,
          borderRadius: s.glowSize / 2,
          backgroundColor: s.bgGlow,
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            color: s.bodySoft,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {dateLabel}
        </Text>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: s.chipBg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: s.chipInk,
            }}
          />
          <Text
            style={{
              color: s.chipInk,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {a.label}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 28,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 14,
        }}
      >
        <Text
          style={{
            color: s.bigNumber,
            fontSize: 120,
            fontWeight: '900',
            letterSpacing: -6,
            lineHeight: 104,
            marginBottom: -2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {String(stepNumber).padStart(2, '0')}
        </Text>
        <View style={{ flex: 1, marginBottom: 10 }}>
          <Text
            style={{
              color: s.bodySoft,
              fontSize: 9,
              fontWeight: '800',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            Etapa · {moment.stepCode.split('·')[0].trim()}
          </Text>
          <Text
            style={{
              color: PAPER,
              fontSize: 16,
              fontWeight: '800',
              letterSpacing: -0.3,
              marginTop: 4,
            }}
          >
            {moment.eyebrow}
          </Text>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: s.divider,
          marginVertical: 20,
        }}
      />

      <Text
        style={{
          color: PAPER,
          fontSize: 24,
          lineHeight: 30,
          fontWeight: '800',
          letterSpacing: -0.5,
        }}
      >
        {moment.title}
      </Text>
      <Text
        style={{
          color: s.bodyMuted,
          fontSize: 14,
          lineHeight: 21,
          marginTop: 10,
        }}
      >
        {moment.description}
      </Text>

      <View
        style={{
          marginTop: 22,
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onPressCta}
          style={{
            flex: 1,
            backgroundColor: s.cta,
            borderRadius: 14,
            paddingVertical: 15,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: s.ctaInk,
              fontSize: 15,
              fontWeight: '800',
              letterSpacing: -0.2,
            }}
          >
            {moment.ctaLabel}
          </Text>
          <Ionicons name="arrow-forward" size={17} color={s.ctaInk} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressDetail}
          style={{
            width: 50,
            backgroundColor: s.detailBtn,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="layers-outline" size={18} color={s.detailBtnInk} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
