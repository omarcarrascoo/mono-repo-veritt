import React from 'react';
import { View } from 'react-native';

type VrittAbstractShapesVariant = 'hero' | 'compact' | 'wide';

type VrittAbstractShapesProps = {
  tint?: string;
  variant?: VrittAbstractShapesVariant;
};

const PAPER = '#F5F2EA';

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function HeroShapes({ tint }: { tint: string }) {
  const a = (alpha: number) => withAlpha(tint, alpha);
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: -110,
          right: -90,
          width: 300,
          height: 300,
          borderRadius: 150,
          borderWidth: 1,
          borderColor: a(0.08),
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: -30,
          right: 30,
          width: 140,
          height: 140,
          borderRadius: 70,
          borderWidth: 1,
          borderColor: a(0.06),
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 40,
          right: 110,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: a(0.18),
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -40,
          left: -30,
          width: 110,
          height: 110,
          borderWidth: 1,
          borderColor: a(0.07),
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 120,
          right: -40,
          width: 220,
          height: 1.2,
          backgroundColor: a(0.07),
          transform: [{ rotate: '-28deg' }],
        }}
      />
    </>
  );
}

function CompactShapes({ tint }: { tint: string }) {
  const a = (alpha: number) => withAlpha(tint, alpha);
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 1,
          borderColor: a(0.09),
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 6,
          right: 24,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: a(0.22),
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -24,
          left: -10,
          width: 60,
          height: 60,
          borderWidth: 1,
          borderColor: a(0.07),
          transform: [{ rotate: '45deg' }],
        }}
      />
    </>
  );
}

function WideShapes({ tint }: { tint: string }) {
  const a = (alpha: number) => withAlpha(tint, alpha);
  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: -60,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: 90,
          borderWidth: 1,
          borderColor: a(0.09),
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 8,
          right: 60,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: a(0.22),
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -32,
          right: 80,
          width: 70,
          height: 70,
          borderWidth: 1,
          borderColor: a(0.07),
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 30,
          left: -30,
          width: 180,
          height: 1.2,
          backgroundColor: a(0.07),
          transform: [{ rotate: '-14deg' }],
        }}
      />
    </>
  );
}

export function VrittAbstractShapes({
  tint = PAPER,
  variant = 'hero',
}: VrittAbstractShapesProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {variant === 'hero' ? <HeroShapes tint={tint} /> : null}
      {variant === 'compact' ? <CompactShapes tint={tint} /> : null}
      {variant === 'wide' ? <WideShapes tint={tint} /> : null}
    </View>
  );
}
