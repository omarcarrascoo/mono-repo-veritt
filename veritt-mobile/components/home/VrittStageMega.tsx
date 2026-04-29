import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DailyChainMoment } from '@/lib/daily-chain-home';
import { STAGE_ACCENTS } from '@/lib/stage-tokens';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';
import { heroSkin, surface } from '@/constants/design-tokens';

type VrittStageMegaProps = {
  moment: DailyChainMoment;
  stepNumber: number;
  dateLabel: string;
  onPressCta: () => void;
  onPressDetail: () => void;
};

// El skin por etapa vive en `constants/design-tokens.ts` como `heroSkin`.
const PAPER = surface.paper;

export function VrittStageMega({
  moment,
  stepNumber,
  dateLabel,
  onPressCta,
  onPressDetail,
}: VrittStageMegaProps) {
  const a = STAGE_ACCENTS[moment.tone];
  const s = heroSkin[moment.tone];

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

      <VrittAbstractShapes tint={PAPER} variant="hero" />

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
          alignItems: 'center',
          gap: 14,
        }}
      >
        <Text
          style={{
            color: s.bigNumber,
            fontSize: 90,
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
