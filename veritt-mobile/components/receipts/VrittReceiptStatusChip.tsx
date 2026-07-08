import React, { memo } from 'react';
import { Text, View } from 'react-native';

import {
  palette,
  radius,
  withAlpha,
} from '@/constants/design-tokens';
import {
  RECEIPT_STATUS_LABEL,
  statusToTone,
  type ReceiptTone,
} from '@/lib/receipts-formatters';
import type { ReceiptStatus } from '@/types/receipt.types';

interface VrittReceiptStatusChipProps {
  status: ReceiptStatus;
  size?: 'sm' | 'md';
}

interface ToneSkin {
  bg: string;
  ink: string;
  dot: string;
}

export function receiptToneSkin(tone: ReceiptTone): ToneSkin {
  switch (tone) {
    case 'cancelled':
      return {
        bg: withAlpha(palette.danger, 0.16),
        ink: palette.dangerDeep,
        dot: palette.danger,
      };
    case 'partial':
      return {
        bg: withAlpha(palette.amber, 0.16),
        ink: palette.amberDeep,
        dot: palette.amber,
      };
    case 'completed':
    default:
      return {
        bg: withAlpha(palette.forest, 0.14),
        ink: palette.forestDeep,
        dot: palette.forest,
      };
  }
}

function Component({ status, size = 'md' }: VrittReceiptStatusChipProps) {
  const tone = statusToTone(status);
  const skin = receiptToneSkin(tone);
  const isSm = size === 'sm';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: isSm ? 8 : 10,
        paddingVertical: isSm ? 4 : 5,
        borderRadius: radius.pill,
        backgroundColor: skin.bg,
      }}
    >
      <View
        style={{
          width: isSm ? 5 : 6,
          height: isSm ? 5 : 6,
          borderRadius: 3,
          backgroundColor: skin.dot,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          color: skin.ink,
          fontSize: isSm ? 9 : 10,
          fontWeight: '900',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {RECEIPT_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export const VrittReceiptStatusChip = memo(Component);
