import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { VrittAbstractShapes } from '@/components/home/VrittAbstractShapes';
import {
  hairline,
  navbar,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

// ── VrittInventoryHero ────────────────────────────────────────────────
// Hero ink card del módulo inventario. Muestra el valor total inventariado
// (o un número grande representativo) y métricas auxiliares con divisores.

export interface InventoryHeroMetric {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning' | 'danger';
}

interface VrittInventoryHeroProps {
  eyebrow: string;
  /** Texto grande superior (e.g. "$120,500"). */
  primaryValue: string;
  /** Etiqueta del valor principal (e.g. "valor total"). */
  primaryLabel: string;
  /** Hasta 3 métricas (más se cortan). */
  metrics: InventoryHeroMetric[];
  /** Tono del halo del hero — neutro/atención/alerta. */
  tone?: 'neutral' | 'warning' | 'danger';
}

function Component({
  eyebrow,
  primaryValue,
  primaryLabel,
  metrics,
  tone = 'neutral',
}: VrittInventoryHeroProps) {
  const haloColor =
    tone === 'danger'
      ? withAlpha(palette.danger, 0.2)
      : tone === 'warning'
      ? withAlpha(palette.amber, 0.2)
      : withAlpha(palette.steel, 0.16);
  const dotColor =
    tone === 'danger'
      ? palette.danger
      : tone === 'warning'
      ? palette.amber
      : palette.paper;

  return (
    <View
      style={{
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: surface.ink,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[palette.inkTinted, surface.ink, palette.inkDeep]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[...navbar.steelOverlay]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.9 }}
        style={absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -90,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: haloColor,
        }}
      />
      <VrittAbstractShapes tint={palette.paper} variant="hero" />

      <View style={{ padding: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: dotColor,
            }}
          />
          <Text
            style={{
              color: text.onInk.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color: palette.paper,
            fontSize: 44,
            fontWeight: '800',
            letterSpacing: -2,
            marginTop: 14,
            fontVariant: ['tabular-nums'],
          }}
        >
          {primaryValue}
        </Text>
        <Text
          style={{
            color: text.onInk.soft,
            fontSize: 13,
            fontWeight: '700',
            marginTop: 4,
            letterSpacing: -0.1,
          }}
        >
          {primaryLabel}
        </Text>

        {metrics.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 22,
              paddingTop: 18,
              borderTopWidth: 1,
              borderTopColor: hairline.onInk,
            }}
          >
            {metrics.slice(0, 3).map((m, idx) => (
              <React.Fragment key={`${m.label}-${idx}`}>
                {idx > 0 ? (
                  <View
                    style={{
                      width: 1,
                      backgroundColor: hairline.onInk,
                    }}
                  />
                ) : null}
                <HeroMetric metric={m} />
              </React.Fragment>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function HeroMetric({ metric }: { metric: InventoryHeroMetric }) {
  const valueColor =
    metric.tone === 'danger'
      ? palette.danger
      : metric.tone === 'warning'
      ? palette.amber
      : palette.paper;
  return (
    <View style={{ flex: 1 }}>
      <Text
        numberOfLines={1}
        style={{
          color: text.onInk.muted,
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {metric.label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: valueColor,
          fontSize: 18,
          fontWeight: '800',
          letterSpacing: -0.4,
          fontVariant: ['tabular-nums'],
          marginTop: 6,
        }}
      >
        {metric.value}
      </Text>
    </View>
  );
}

export const VrittInventoryHero = memo(Component);

const absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
