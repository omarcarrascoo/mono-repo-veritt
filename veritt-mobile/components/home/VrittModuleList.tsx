import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type VrittModuleRow = {
  key: string;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type Variant = 'paper' | 'ink';

type VrittModuleListProps = {
  title: string;
  eyebrow: string;
  modules: VrittModuleRow[];
  variant?: Variant;
};

const STYLES: Record<
  Variant,
  {
    bg: string;
    ink: string;
    eyebrow: string;
    hint: string;
    iconBg: string;
    iconInk: string;
    divider: string;
    chevron: string;
    border: string;
  }
> = {
  paper: {
    bg: '#FFFFFF',
    ink: '#0A0A0A',
    eyebrow: 'rgba(10,10,10,0.45)',
    hint: 'rgba(10,10,10,0.55)',
    iconBg: 'rgba(10,10,10,0.06)',
    iconInk: '#0A0A0A',
    divider: 'rgba(10,10,10,0.08)',
    chevron: 'rgba(10,10,10,0.35)',
    border: 'rgba(10,10,10,0.08)',
  },
  ink: {
    bg: '#0A0A0A',
    ink: '#F5F2EA',
    eyebrow: 'rgba(245,242,234,0.48)',
    hint: 'rgba(245,242,234,0.46)',
    iconBg: 'rgba(245,242,234,0.08)',
    iconInk: 'rgba(245,242,234,0.86)',
    divider: 'rgba(245,242,234,0.06)',
    chevron: 'rgba(245,242,234,0.36)',
    border: 'transparent',
  },
};

export function VrittModuleList({
  title,
  eyebrow,
  modules,
  variant = 'paper',
}: VrittModuleListProps) {
  const s = STYLES[variant];

  return (
    <View
      style={{
        backgroundColor: s.bg,
        borderRadius: 22,
        borderWidth: s.border === 'transparent' ? 0 : 1,
        borderColor: s.border,
        padding: 20,
        gap: 16,
      }}
    >
      <View>
        <Text
          style={{
            color: s.eyebrow,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            color: s.ink,
            fontSize: 20,
            fontWeight: '800',
            letterSpacing: -0.4,
            marginTop: 3,
          }}
        >
          {title}
        </Text>
      </View>

      <View style={{ gap: 0 }}>
        {modules.map((m, idx) => (
          <TouchableOpacity
            key={m.key}
            activeOpacity={0.85}
            onPress={m.onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 14,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: s.divider,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: s.iconBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={m.icon} size={16} color={s.iconInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: s.ink,
                  fontSize: 14,
                  fontWeight: '700',
                  letterSpacing: -0.2,
                }}
              >
                {m.label}
              </Text>
              <Text
                style={{
                  color: s.hint,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {m.hint}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={15} color={s.chevron} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
