import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type VrittTimelineEventState = 'done' | 'active' | 'review' | 'pending' | 'blocked';

export type VrittTimelineEvent = {
  key: string;
  time: string;
  title: string;
  detail?: string;
  state: VrittTimelineEventState;
  icon: keyof typeof Ionicons.glyphMap;
};

const STATE_VISUALS: Record<
  VrittTimelineEventState,
  {
    dotBg: string;
    dotInk: string;
    dotBorder: string;
    line: string;
    title: string;
    detail: string;
    time: string;
    timeLabel: string;
  }
> = {
  done: {
    dotBg: '#4A7C59',
    dotInk: '#F5F2EA',
    dotBorder: '#4A7C59',
    line: '#4A7C59',
    title: '#0A0A0A',
    detail: 'rgba(10,10,10,0.55)',
    time: '#1F3A2B',
    timeLabel: 'Hecho',
  },
  active: {
    dotBg: '#0B0E12',
    dotInk: '#F5F2EA',
    dotBorder: '#0B0E12',
    line: 'rgba(10,10,10,0.14)',
    title: '#0A0A0A',
    detail: 'rgba(10,10,10,0.55)',
    time: '#0B0E12',
    timeLabel: 'En curso',
  },
  review: {
    dotBg: '#C48A3A',
    dotInk: '#1A0F03',
    dotBorder: '#C48A3A',
    line: 'rgba(196,138,58,0.32)',
    title: '#0A0A0A',
    detail: 'rgba(10,10,10,0.55)',
    time: '#5E3F14',
    timeLabel: 'Revisión',
  },
  blocked: {
    dotBg: '#C25450',
    dotInk: '#2A0606',
    dotBorder: '#C25450',
    line: 'rgba(194,84,80,0.3)',
    title: '#0A0A0A',
    detail: 'rgba(10,10,10,0.55)',
    time: '#3D1312',
    timeLabel: 'Bloqueado',
  },
  pending: {
    dotBg: 'rgba(10,10,10,0.05)',
    dotInk: 'rgba(10,10,10,0.38)',
    dotBorder: 'rgba(10,10,10,0.12)',
    line: 'rgba(10,10,10,0.08)',
    title: 'rgba(10,10,10,0.48)',
    detail: 'rgba(10,10,10,0.4)',
    time: 'rgba(10,10,10,0.42)',
    timeLabel: 'Pendiente',
  },
};

type VrittDayTimelineProps = {
  events: VrittTimelineEvent[];
};

export function VrittDayTimeline({ events }: VrittDayTimelineProps) {
  const doneCount = events.filter((e) => e.state === 'done').length;
  const hasBlocked = events.some((e) => e.state === 'blocked');

  const chipVisual = hasBlocked
    ? { bg: 'rgba(194,84,80,0.12)', ink: '#3D1312' }
    : { bg: 'rgba(74,124,89,0.14)', ink: '#1F3A2B' };

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(10,10,10,0.08)',
        padding: 20,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 20,
        }}
      >
        <View>
          <Text
            style={{
              color: 'rgba(10,10,10,0.45)',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.8,
              textTransform: 'uppercase',
            }}
          >
            Línea del día
          </Text>
          <Text
            style={{
              color: '#0A0A0A',
              fontSize: 19,
              fontWeight: '800',
              letterSpacing: -0.4,
              marginTop: 3,
            }}
          >
            Así va la jornada
          </Text>
        </View>

        <View
          style={{
            backgroundColor: chipVisual.bg,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              color: chipVisual.ink,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 0.6,
              fontVariant: ['tabular-nums'],
            }}
          >
            {doneCount}/{events.length}
          </Text>
        </View>
      </View>

      {events.map((ev, idx) => {
        const isLast = idx === events.length - 1;
        const v = STATE_VISUALS[ev.state];

        return (
          <View
            key={ev.key}
            style={{ flexDirection: 'row', alignItems: 'stretch' }}
          >
            <View style={{ width: 40, alignItems: 'center' }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: v.dotBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: v.dotBorder,
                }}
              >
                <Ionicons name={ev.icon} size={13} color={v.dotInk} />
              </View>
              {!isLast ? (
                <View
                  style={{
                    flex: 1,
                    width: 1.5,
                    backgroundColor: v.line,
                    marginTop: 4,
                  }}
                />
              ) : null}
            </View>

            <View
              style={{
                flex: 1,
                paddingLeft: 14,
                paddingBottom: isLast ? 0 : 18,
                paddingTop: 1,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <Text
                  style={{
                    color: v.title,
                    fontSize: 14,
                    fontWeight: '800',
                    letterSpacing: -0.2,
                    flex: 1,
                    marginRight: 8,
                  }}
                >
                  {ev.title}
                </Text>
                <Text
                  style={{
                    color: v.time,
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {v.timeLabel}
                </Text>
              </View>
              {ev.detail ? (
                <Text
                  style={{
                    color: v.detail,
                    fontSize: 12,
                    marginTop: 3,
                    lineHeight: 16,
                  }}
                >
                  {ev.detail}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
