import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { radius, stateOnInk, stateOnPaper } from '@/constants/design-tokens';
import type { ChainTone } from '@/lib/daily-chain-home';

// ── VrittStatusChip ───────────────────────────────────────────────────
// Chip estado-tonado: dot + label. Funciona tanto sobre paper como sobre
// ink. Consume los tokens semánticos `stateOnPaper` / `stateOnInk` para
// mantener la regla "color comunica estado, no decora".

interface VrittStatusChipProps {
  tone: ChainTone;
  label: string;
  /** Sobre fondo oscuro (`ink`) cambia el contraste. Default `paper`. */
  surface?: 'paper' | 'ink';
  size?: 'sm' | 'md';
}

function Component({
  tone,
  label,
  surface = 'paper',
  size = 'md',
}: VrittStatusChipProps) {
  const skin = surface === 'ink' ? stateOnInk[tone] : stateOnPaper[tone];
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
        backgroundColor: skin.chipBg,
      }}
    >
      <View
        style={{
          width: isSm ? 5 : 6,
          height: isSm ? 5 : 6,
          borderRadius: 3,
          backgroundColor: skin.accent,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          color: skin.chipInk,
          fontSize: isSm ? 9 : 10,
          fontWeight: '900',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export const VrittStatusChip = memo(Component);
