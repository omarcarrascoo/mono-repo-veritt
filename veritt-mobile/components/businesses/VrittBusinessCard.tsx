import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { ChainTone } from '@/lib/daily-chain-home';
import type { BusinessType, MembershipRole } from '@/types/business.types';

type VrittBusinessCardProps = {
  name: string;
  businessType: BusinessType;
  role: MembershipRole | null;
  tone: ChainTone;
  stageLabel: string;
  stepCode: string;
  /** Ya formateado. Si es null, el rol no ve dinero y mostramos operativo. */
  dailySalesLabel: string | null;
  ticketCount: number;
  activeStaffCount: number;
  onboardingPercent: number;
  isActive: boolean;
  isLoading: boolean;
  width: number;
  height: number;
  onPress: () => void;
};

const INK = '#0B0E12';
const PAPER = '#F5F2EA';
const PAPER_SOFT = '#EDE8D9';
const PAPER_WARM = '#DFD8C2';

const TONE_ACCENT: Record<
  ChainTone,
  { dot: string; chipBg: string; chipInk: string; bar: string }
> = {
  start: {
    dot: INK,
    chipBg: 'rgba(11,14,18,0.08)',
    chipInk: INK,
    bar: INK,
  },
  progress: {
    dot: '#4A7C59',
    chipBg: 'rgba(74,124,89,0.14)',
    chipInk: '#1F3A2B',
    bar: '#4A7C59',
  },
  review: {
    dot: '#C48A3A',
    chipBg: 'rgba(196,138,58,0.18)',
    chipInk: '#5E3F14',
    bar: '#C48A3A',
  },
  blocker: {
    dot: '#C25450',
    chipBg: 'rgba(194,84,80,0.18)',
    chipInk: '#3D1312',
    bar: '#C25450',
  },
  done: {
    dot: '#4A7C59',
    chipBg: 'rgba(74,124,89,0.18)',
    chipInk: '#1F3A2B',
    bar: '#4A7C59',
  },
};

const TYPE_LABEL: Record<BusinessType, string> = {
  RESTAURANT: 'Restaurante',
  CAFE: 'Cafetería',
  BAR: 'Bar',
  RETAIL: 'Retail',
  OTHER: 'Otro',
};

const ROLE_LABEL: Record<MembershipRole, string> = {
  OWNER: 'Dueño',
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operador',
  VERITT_STAFF: 'Veritt',
};

function formatStaff(n: number): string {
  if (n === 0) return 'Sin equipo';
  if (n === 1) return '1 activo';
  return `${n} activos`;
}

function Component({
  name,
  businessType,
  role,
  tone,
  stageLabel,
  stepCode,
  dailySalesLabel,
  ticketCount,
  activeStaffCount,
  onboardingPercent,
  isActive,
  isLoading,
  width,
  height,
  onPress,
}: VrittBusinessCardProps) {
  const accent = TONE_ACCENT[tone];
  const typeLabel = TYPE_LABEL[businessType];
  const roleLabel = role ? ROLE_LABEL[role] : null;
  const initial = name.charAt(0).toUpperCase();
  const canFinance = dailySalesLabel !== null;

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      style={{
        width,
        height,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isActive
          ? 'rgba(11,14,18,0.2)'
          : 'rgba(11,14,18,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.28,
        shadowRadius: 28,
        elevation: 12,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[PAPER, PAPER_SOFT, PAPER_WARM]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
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
        colors={['rgba(107,122,143,0.1)', 'rgba(107,122,143,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <View
        style={{
          flex: 1,
          padding: 26,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: 'rgba(11,14,18,0.5)',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 2,
                textTransform: 'uppercase',
                flex: 1,
              }}
            >
              {typeLabel}
              {roleLabel ? ` · ${roleLabel}` : ''}
            </Text>

            {isActive ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 7,
                  backgroundColor: INK,
                }}
              >
                <Text
                  style={{
                    color: PAPER,
                    fontSize: 10,
                    fontWeight: '900',
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  Activo
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: INK,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: PAPER,
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
                numberOfLines={2}
                style={{
                  color: INK,
                  fontSize: 30,
                  fontWeight: '900',
                  letterSpacing: -1.4,
                  lineHeight: 32,
                }}
              >
                {name}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: accent.chipBg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: accent.dot,
                }}
              />
              <Text
                style={{
                  color: accent.chipInk,
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.3,
                  textTransform: 'uppercase',
                }}
              >
                {stageLabel}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: 'rgba(11,14,18,0.5)',
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                flex: 1,
              }}
            >
              {stepCode}
            </Text>
          </View>
        </View>

        <View style={{ gap: 20 }}>
          <View>
            <Text
              style={{
                color: 'rgba(11,14,18,0.5)',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {canFinance ? 'Ventas de hoy' : 'Actividad del día'}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: INK,
                fontSize: 44,
                fontWeight: '900',
                letterSpacing: -2,
                marginTop: 4,
                fontVariant: ['tabular-nums'],
              }}
            >
              {isLoading
                ? '—'
                : canFinance
                ? dailySalesLabel
                : ticketCount === 0
                ? 'Sin tickets'
                : `${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {canFinance ? (
              <Metric
                label="Equipo"
                value={isLoading ? '—' : formatStaff(activeStaffCount)}
              />
            ) : (
              <Metric
                label="Etapa"
                value={isLoading ? '—' : stageLabel}
              />
            )}
            <Metric
              label="Onboarding"
              value={isLoading ? '—' : `${onboardingPercent}%`}
            />
          </View>

          <View style={{ gap: 10 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(11,14,18,0.08)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 4,
                  width: `${Math.max(2, onboardingPercent)}%`,
                  backgroundColor: accent.bar,
                }}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: 'rgba(11,14,18,0.5)',
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Abrir negocio
              </Text>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: INK,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-forward" size={18} color={PAPER} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(11,14,18,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(11,14,18,0.06)',
      }}
    >
      <Text
        style={{
          color: 'rgba(11,14,18,0.5)',
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: INK,
          fontSize: 18,
          fontWeight: '900',
          letterSpacing: -0.5,
          marginTop: 6,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export const VrittBusinessCard = memo(Component);
