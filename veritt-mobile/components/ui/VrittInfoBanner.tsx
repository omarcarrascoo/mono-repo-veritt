import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import type { ChainTone } from '@/lib/daily-chain-home';

// ── VrittInfoBanner ───────────────────────────────────────────────────
// Banner contextual sobre paper. Tono comunica intención (review / done /
// blocker / info). El icon es opcional — si no viene, usa el del tono.

interface VrittInfoBannerProps {
  tone: 'review' | 'done' | 'blocker' | 'info';
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

function Component({
  tone,
  title,
  description,
  icon,
}: VrittInfoBannerProps) {
  const skin = bannerSkin(tone);
  const resolvedIcon = icon ?? skin.defaultIcon;

  return (
    <View
      style={{
        backgroundColor: skin.bg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: skin.border,
        padding: 14,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <Ionicons
        name={resolvedIcon}
        size={18}
        color={skin.deep}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text
          style={{
            color: skin.deep,
            fontSize: 13,
            fontWeight: '900',
            letterSpacing: -0.2,
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              color: skin.deep,
              fontSize: 12,
              lineHeight: 17,
              fontWeight: '600',
              opacity: 0.85,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface BannerSkin {
  bg: string;
  border: string;
  deep: string;
  defaultIcon: keyof typeof Ionicons.glyphMap;
}

function bannerSkin(tone: VrittInfoBannerProps['tone']): BannerSkin {
  switch (tone) {
    case 'review':
      return {
        bg: withAlpha(palette.amber, 0.1),
        border: withAlpha(palette.amber, 0.2),
        deep: palette.amberDeep,
        defaultIcon: 'time-outline',
      };
    case 'done':
      return {
        bg: withAlpha(palette.forest, 0.1),
        border: withAlpha(palette.forest, 0.2),
        deep: palette.forestDeep,
        defaultIcon: 'checkmark-circle',
      };
    case 'blocker':
      return {
        bg: withAlpha(palette.danger, 0.08),
        border: withAlpha(palette.danger, 0.2),
        deep: palette.dangerDeep,
        defaultIcon: 'alert-circle',
      };
    case 'info':
    default:
      return {
        bg: surface.card,
        border: hairline.onPaper,
        deep: text.onPaper.primary,
        defaultIcon: 'information-circle-outline',
      };
  }
}

export const VrittInfoBanner = memo(Component);
// Type re-export para callers que quieren la unión exacta del tono.
export type { ChainTone };
