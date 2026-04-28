import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type VrittSemaphoreState =
  | 'done'
  | 'active'
  | 'review'
  | 'blocked'
  | 'pending';

export type VrittSemaphoreStep = {
  code: string;
  label: string;
  state: VrittSemaphoreState;
};

const STATE_COLORS: Record<
  VrittSemaphoreState,
  { fill: string; ink: string; label: string; ring?: string }
> = {
  done: {
    fill: '#4A7C59',
    ink: '#F5F2EA',
    label: 'Hecho',
  },
  active: {
    fill: '#0A0A0A',
    ink: '#F5F2EA',
    label: 'En curso',
    ring: 'rgba(10,10,10,0.18)',
  },
  review: {
    fill: '#C48A3A',
    ink: '#1A0F03',
    label: 'Revisión',
  },
  blocked: {
    fill: '#C25450',
    ink: '#2A0606',
    label: 'Bloqueado',
  },
  pending: {
    fill: 'rgba(10,10,10,0.08)',
    ink: 'rgba(10,10,10,0.42)',
    label: 'Pendiente',
  },
};

type VrittChainSemaphoreProps = {
  steps: VrittSemaphoreStep[];
  onPress?: () => void;
};

export function VrittChainSemaphore({ steps, onPress }: VrittChainSemaphoreProps) {
  const doneCount = steps.filter((s) => s.state === 'done').length;
  const hasBlocked = steps.some((s) => s.state === 'blocked');

  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { activeOpacity: 0.88, onPress } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        backgroundColor: '#F5F2EA',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(10,10,10,0.06)',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <View>
          <Text
            style={{
              color: 'rgba(10,10,10,0.45)',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Cadena del día
          </Text>
          <Text
            style={{
              color: '#0A0A0A',
              fontSize: 15,
              fontWeight: '800',
              letterSpacing: -0.3,
              marginTop: 2,
            }}
          >
            Avance por pasos
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
            backgroundColor: hasBlocked
              ? 'rgba(194,84,80,0.12)'
              : 'rgba(74,124,89,0.14)',
          }}
        >
          <Text
            style={{
              color: hasBlocked ? '#3D1312' : '#1F3A2B',
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.6,
              fontVariant: ['tabular-nums'],
            }}
          >
            {doneCount}/{steps.length}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {steps.map((step) => {
          const c = STATE_COLORS[step.state];
          return (
            <View
              key={step.code}
              style={{ flex: 1, alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: '100%',
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: c.fill,
                }}
              />
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: c.fill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: c.ring ? 3 : 0,
                  borderColor: c.ring ?? 'transparent',
                }}
              >
                {step.state === 'done' ? (
                  <Ionicons name="checkmark" size={14} color={c.ink} />
                ) : step.state === 'blocked' ? (
                  <Ionicons name="close" size={14} color={c.ink} />
                ) : step.state === 'review' ? (
                  <Ionicons name="hourglass-outline" size={12} color={c.ink} />
                ) : step.state === 'active' ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: c.ink,
                    }}
                  />
                ) : null}
              </View>
              <Text
                style={{
                  color: '#0A0A0A',
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                }}
              >
                {step.code}
              </Text>
              <Text
                style={{
                  color: 'rgba(10,10,10,0.5)',
                  fontSize: 9,
                  fontWeight: '600',
                  letterSpacing: 0.2,
                  textTransform: 'uppercase',
                }}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </Wrapper>
  );
}
