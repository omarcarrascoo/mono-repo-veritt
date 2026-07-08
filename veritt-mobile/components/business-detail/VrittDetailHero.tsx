import React, { memo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { ChainTone } from '@/lib/daily-chain-home';
import type { BusinessType, MembershipRole } from '@/types/business.types';
import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';
import {
  hairline,
  heroSkin,
  navbar,
  palette,
  radius,
  stateOnInk,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

type VrittDetailHeroProps = {
  name: string;
  businessType: BusinessType;
  role: MembershipRole | null;
  roleLabel: string;
  tone: ChainTone;
  stageLabel: string;
  stepCode: string;
  city?: string;
  state?: string;
  description?: string;
  onboardingPercent: number;
  onBack: () => void;
  onOpenChain: () => void;
};

const TYPE_LABEL: Record<BusinessType, string> = {
  RESTAURANT: 'Restaurante',
  CAFE: 'Cafetería',
  BAR: 'Bar',
  RETAIL: 'Retail',
  OTHER: 'Otro',
};

function Component({
  name,
  businessType,
  role,
  roleLabel,
  tone,
  stageLabel,
  stepCode,
  city,
  state,
  description,
  onboardingPercent,
  onBack,
  onOpenChain,
}: VrittDetailHeroProps) {
  const skin = heroSkin[tone];
  const accent = stateOnInk[tone];
  const typeLabel = TYPE_LABEL[businessType];
  const initial = name.charAt(0).toUpperCase();
  const location = [city, state].filter(Boolean).join(', ');

  return (
    <View style={{ backgroundColor: skin.bg, paddingBottom: 44 }}>
      <LinearGradient
        pointerEvents="none"
        colors={[palette.inkTinted, skin.bg, palette.inkDeep]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[...navbar.steelOverlay]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.15, y: 0.9 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 360,
          height: 360,
          borderRadius: 180,
          backgroundColor: accent.halo,
        }}
      />
      <VrittAbstractShapes tint={palette.paper} variant="hero" />

      <View
        style={{
          paddingTop: Platform.OS === 'ios' ? 64 : 56,
          paddingHorizontal: 22,
        }}
      >
        {/* Nav row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={onBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: hairline.onInk,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(palette.paper, 0.04),
            }}
          >
            <Ionicons name="arrow-back" size={18} color={palette.paper} />
          </Pressable>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: accent.chipBg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              borderRadius: radius.sm,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: accent.accent,
              }}
            />
            <Text
              style={{
                color: accent.chipInk,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {stageLabel}
            </Text>
          </View>
        </View>

        {/* Display */}
        <View style={{ marginTop: 32, gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: radius.lg,
                backgroundColor: withAlpha(palette.paper, 0.08),
                borderWidth: 1,
                borderColor: hairline.onInk,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: palette.paper,
                  fontSize: 28,
                  fontWeight: '900',
                  letterSpacing: -1,
                }}
              >
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: text.onInk.muted,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 2.4,
                  textTransform: 'uppercase',
                }}
              >
                {typeLabel}
                {role ? `  ·  ${roleLabel}` : ''}
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={{
              color: palette.paper,
              fontSize: 44,
              fontWeight: '800',
              letterSpacing: -2,
              lineHeight: 48,
            }}
          >
            {name}
          </Text>

          {location ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons
                name="location-outline"
                size={13}
                color={text.onInk.muted}
              />
              <Text
                style={{
                  color: text.onInk.soft,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: -0.1,
                }}
              >
                {location}
              </Text>
            </View>
          ) : null}

          {description ? (
            <Text
              numberOfLines={2}
              style={{
                color: text.onInk.muted,
                fontSize: 14,
                lineHeight: 20,
                marginTop: 4,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {/* Progress + chain CTA */}
        <View style={{ marginTop: 32, gap: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                color: text.onInk.muted,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Onboarding
            </Text>
            <Text
              style={{
                color: palette.paper,
                fontSize: 13,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}
            >
              {onboardingPercent}%
            </Text>
          </View>
          <View
            style={{
              height: 3,
              backgroundColor: withAlpha(palette.paper, 0.08),
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 3,
                width: `${Math.max(2, onboardingPercent)}%`,
                backgroundColor: accent.accent,
              }}
            />
          </View>

          <Pressable
            onPress={onOpenChain}
            style={{
              marginTop: 6,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: hairline.onInk,
              borderRadius: radius.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: withAlpha(palette.paper, 0.04),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons
                name="layers-outline"
                size={16}
                color={palette.paper}
              />
              <Text
                style={{
                  color: palette.paper,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: -0.2,
                }}
              >
                Cadena del día
              </Text>
              <Text
                style={{
                  color: text.onInk.muted,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
                numberOfLines={1}
              >
                {stepCode}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={palette.paper}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const VrittDetailHero = memo(Component);
