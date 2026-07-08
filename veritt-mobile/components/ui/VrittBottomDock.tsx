import React, { memo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hairline, surface } from '@/constants/design-tokens';

// ── VrittBottomDock ───────────────────────────────────────────────────
// Wrapper consistente para docks fijos al pie. Usa safe-area insets para
// el padding inferior — antes lo hardcodeábamos por plataforma.

interface VrittBottomDockProps {
  children: React.ReactNode;
  /** Quita el divisor superior si quieres un dock libre. */
  hideDivider?: boolean;
}

const MIN_BOTTOM_PADDING = 18;

function Component({ children, hideDivider }: VrittBottomDockProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PADDING),
        backgroundColor: surface.paper,
        borderTopWidth: hideDivider ? 0 : 1,
        borderTopColor: hairline.onPaper,
      }}
    >
      {children}
    </View>
  );
}

export const VrittBottomDock = memo(Component);
