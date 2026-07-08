import React, { memo } from 'react';
import { Text, View } from 'react-native';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

export type DetailFact = {
  key: string;
  label: string;
  value: string;
  hint?: string;
};

type VrittDetailInfoProps = {
  eyebrow: string;
  title: string;
  facts: DetailFact[];
};

function Component({ eyebrow, title, facts }: VrittDetailInfoProps) {
  if (facts.length === 0) return null;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ paddingHorizontal: 4 }}>
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
        <Text
          style={{
            color: text.onPaper.primary,
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: -0.6,
            marginTop: 4,
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: surface.card,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          borderRadius: radius.lg,
          paddingHorizontal: 20,
          paddingVertical: 6,
        }}
      >
        {facts.map((fact, idx) => (
          <View
            key={fact.key}
            style={{
              paddingVertical: 14,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: hairline.onPaperSoft,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: text.onPaper.muted,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                {fact.label}
              </Text>
              {fact.hint ? (
                <Text
                  style={{
                    color: text.onPaper.subtle,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {fact.hint}
                </Text>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: text.onPaper.primary,
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: -0.2,
                fontVariant: ['tabular-nums'],
                textAlign: 'right',
                maxWidth: 180,
              }}
            >
              {fact.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const VrittDetailInfo = memo(Component);
