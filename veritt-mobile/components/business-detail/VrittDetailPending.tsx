import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  text,
  withAlpha,
} from '@/constants/design-tokens';

type VrittDetailPendingProps = {
  steps: string[];
  onStart: () => void;
};

function Component({ steps, onStart }: VrittDetailPendingProps) {
  if (steps.length === 0) return null;

  return (
    <View
      style={{
        borderRadius: radius.lg,
        backgroundColor: palette.ink,
        padding: 22,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: withAlpha(palette.amber, 0.14),
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <View>
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            Próximos pasos
          </Text>
          <Text
            style={{
              color: palette.paper,
              fontSize: 22,
              fontWeight: '800',
              letterSpacing: -0.8,
              marginTop: 4,
            }}
          >
            Falta {steps.length === 1 ? 'un paso' : `${steps.length} pasos`}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: withAlpha(palette.amber, 0.18),
            borderRadius: radius.sm,
          }}
        >
          <Text
            style={{
              color: palette.amber,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Onboarding
          </Text>
        </View>
      </View>

      <View style={{ gap: 2, marginBottom: 18 }}>
        {steps.slice(0, 4).map((label, idx) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 10,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: hairline.onInkSoft,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: hairline.onInkStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: palette.paper,
                  fontSize: 11,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {idx + 1}
              </Text>
            </View>
            <Text
              style={{
                color: text.onInk.soft,
                fontSize: 14,
                fontWeight: '600',
                flex: 1,
                letterSpacing: -0.1,
              }}
            >
              {label}
            </Text>
          </View>
        ))}
        {steps.length > 4 ? (
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: hairline.onInkSoft,
            }}
          >
            {steps.length - 4} más
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onStart}
        style={{
          backgroundColor: palette.paper,
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            color: palette.ink,
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          Continuar configuración
        </Text>
        <Ionicons name="arrow-forward" size={16} color={palette.ink} />
      </TouchableOpacity>
    </View>
  );
}

export const VrittDetailPending = memo(Component);
