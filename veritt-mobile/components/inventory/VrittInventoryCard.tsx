import React, { memo, ReactNode } from 'react';
import { Text, View } from 'react-native';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

// ── VrittInventoryCard ────────────────────────────────────────────────
// Card paper con eyebrow + body. Reemplazo de VrittCard+VrittSectionLabel
// dentro del módulo inventario.

interface VrittInventoryCardProps {
  eyebrow?: string;
  trailing?: string;
  description?: string;
  children?: ReactNode;
  /** Sin border ni padding interno (raw container). */
  bare?: boolean;
}

function Component({
  eyebrow,
  trailing,
  description,
  children,
  bare,
}: VrittInventoryCardProps) {
  if (bare) {
    return (
      <View
        style={{
          backgroundColor: surface.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: hairline.onPaper,
        }}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 22,
        gap: 18,
      }}
    >
      {eyebrow ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
          {trailing ? (
            <Text
              style={{
                color: text.onPaper.subtle,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {trailing}
            </Text>
          ) : null}
        </View>
      ) : null}

      {description ? (
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 12,
            lineHeight: 17,
            fontWeight: '600',
          }}
        >
          {description}
        </Text>
      ) : null}

      {children}
    </View>
  );
}

export const VrittInventoryCard = memo(Component);
