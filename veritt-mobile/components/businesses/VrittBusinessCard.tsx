import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ChainTone } from '@/lib/daily-chain-home';
import type { BusinessType, MembershipRole } from '@/types/business.types';
import {
  hairline,
  radius,
  shadow,
  stateOnPaper,
  surface,
  text,
} from '@/constants/design-tokens';

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

const INK = surface.ink;
const INK_SOFT = text.onPaper.soft;
const INK_MUTED = text.onPaper.subtle;
const HAIRLINE = hairline.onPaper;
const HAIRLINE_SOFT = hairline.onPaperSoft;

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
  if (n === 1) return '1 persona';
  return `${n} personas`;
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
  const accent = stateOnPaper[tone];
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
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isActive ? hairline.onPaperStrong : HAIRLINE,
        backgroundColor: surface.card,
        ...shadow.card,
      }}
    >
      {/* Rail vertical de estado: el color que comunica la etapa */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          backgroundColor: accent.accent,
        }}
      />

      {/* Halo muy sutil del tono en la esquina superior izquierda */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -90,
          left: -50,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: accent.halo,
        }}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 26,
          paddingTop: 26,
          paddingBottom: 24,
          paddingLeft: 30,
          justifyContent: 'space-between',
        }}
      >
        {/* Header: kicker + nombre display */}
        <View style={{ gap: 14 }}>
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
                color: INK_MUTED,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 2.4,
                textTransform: 'uppercase',
                flex: 1,
              }}
            >
              {typeLabel}
              {roleLabel ? `  ·  ${roleLabel}` : ''}
            </Text>
            {isActive ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  backgroundColor: INK,
                }}
              >
                <Text
                  style={{
                    color: text.onInk.primary,
                    fontSize: 9,
                    fontWeight: '800',
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Activo
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            numberOfLines={2}
            style={{
              color: INK,
              fontSize: 34,
              fontWeight: '800',
              letterSpacing: -1.2,
              lineHeight: 38,
            }}
          >
            {name}
          </Text>

          {/* Chip de etapa: el acento de color vive aquí */}
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: accent.chipBg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
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
              {stageLabel}  ·  {stepCode.split('·')[0].trim()}
            </Text>
          </View>
        </View>

        {/* Bloque editorial: número grande + separador + secundarios */}
        <View style={{ gap: 22 }}>
          <View>
            <Text
              style={{
                color: INK_MUTED,
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 1.8,
                textTransform: 'uppercase',
              }}
            >
              {canFinance ? 'Ventas del día' : 'Actividad del día'}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: INK,
                fontSize: 44,
                fontWeight: '700',
                letterSpacing: -1.6,
                marginTop: 6,
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

          <View style={{ height: 1, backgroundColor: HAIRLINE_SOFT }} />

          <View style={{ flexDirection: 'row' }}>
            <DataCol
              label={canFinance ? 'Equipo' : 'Etapa'}
              value={
                isLoading
                  ? '—'
                  : canFinance
                  ? formatStaff(activeStaffCount)
                  : stageLabel
              }
            />
            <DataCol
              label="Onboarding"
              value={isLoading ? '—' : `${onboardingPercent}%`}
              align="right"
            />
          </View>

          {/* Barra de progreso + CTA */}
          <View style={{ gap: 14 }}>
            <View
              style={{
                height: 2,
                backgroundColor: HAIRLINE_SOFT,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 2,
                  width: `${Math.max(2, onboardingPercent)}%`,
                  backgroundColor: accent.accent,
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: INK,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: text.onInk.primary,
                      fontSize: 13,
                      fontWeight: '800',
                      letterSpacing: -0.2,
                    }}
                  >
                    {initial}
                  </Text>
                </View>
                <Text
                  style={{
                    color: INK_SOFT,
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  Abrir negocio
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={INK} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DataCol({
  label,
  value,
  align,
}: {
  label: string;
  value: string;
  align?: 'right';
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <Text
        style={{
          color: INK_MUTED,
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: INK,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: -0.2,
          marginTop: 5,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export const VrittBusinessCard = memo(Component);
