import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { hairline, text } from '@/constants/design-tokens';

// ── VrittInventoryFacts ───────────────────────────────────────────────
// Lista label/value para detail screens. Cada fact se separa con hairline.

export interface InventoryFact {
  label: string;
  value: string;
  /** Si es true el valor se renderiza más grande/heavy (e.g. "Stock actual"). */
  highlight?: boolean;
  /** Color custom para el value (e.g. tono danger para alertas). */
  valueColor?: string;
}

interface VrittInventoryFactsProps {
  facts: InventoryFact[];
}

function Component({ facts }: VrittInventoryFactsProps) {
  return (
    <View>
      {facts.map((fact, idx) => (
        <View
          key={`${fact.label}-${idx}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            borderTopWidth: idx === 0 ? 0 : 1,
            borderTopColor: hairline.onPaperSoft,
            gap: 12,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: text.onPaper.muted,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: -0.1,
              flexShrink: 1,
            }}
          >
            {fact.label}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: fact.valueColor ?? text.onPaper.primary,
              fontSize: fact.highlight ? 16 : 13,
              fontWeight: fact.highlight ? '900' : '800',
              letterSpacing: fact.highlight ? -0.4 : -0.2,
              fontVariant: ['tabular-nums'],
              maxWidth: '60%',
              textAlign: 'right',
            }}
          >
            {fact.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const VrittInventoryFacts = memo(Component);
