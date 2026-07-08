import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  shadow,
  surface,
  text,
} from '@/constants/design-tokens';

type VrittPosCartDockProps = {
  itemCount: number;
  total: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  onReview: () => void;
};

function Component({
  itemCount,
  total,
  isSubmitting,
  disabled,
  onReview,
}: VrittPosCartDockProps) {
  const handle = useCallback(() => {
    if (!disabled && !isSubmitting) onReview();
  }, [disabled, isSubmitting, onReview]);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: surface.paper,
        borderTopWidth: 1,
        borderTopColor: hairline.onPaper,
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 26,
        ...shadow.floating,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handle}
        disabled={disabled || isSubmitting}
        style={{
          opacity: disabled ? 0.4 : 1,
          backgroundColor: surface.ink,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(245,242,234,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: palette.paper,
                fontSize: 12,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
              }}
            >
              {itemCount}
            </Text>
          </View>
          <View>
            <Text
              style={{
                color: 'rgba(245,242,234,0.5)',
                fontSize: 9,
                fontWeight: '900',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              {itemCount === 1 ? 'Artículo' : 'Artículos'}
            </Text>
            <Text
              style={{
                color: text.onInk.primary,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.6,
                fontVariant: ['tabular-nums'],
                marginTop: 2,
              }}
            >
              {total}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Text
            style={{
              color: text.onInk.primary,
              fontSize: 13,
              fontWeight: '800',
              letterSpacing: -0.2,
            }}
          >
            {isSubmitting ? 'Procesando...' : 'Cobrar'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={text.onInk.primary}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export const VrittPosCartDock = memo(Component);
