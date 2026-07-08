import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  stateOnPaper,
  surface,
  text,
} from '@/constants/design-tokens';
import {
  formatQty,
  formatVariance,
  getMaterialStatus,
  getVarianceValue,
  statusLabel,
  statusTone,
  type FaiMaterialDraft,
} from '@/lib/fai-utils';

type Props = {
  item: FaiMaterialDraft;
  onPress: (materialId: string) => void;
  /** Etiqueta para la cantidad de referencia (default "Sistema"). Para FCI suele ser "Apertura". */
  referenceLabel?: string;
};

function Component({ item, onPress, referenceLabel = 'Sistema' }: Props) {
  const handlePress = useCallback(
    () => onPress(item.materialId),
    [item.materialId, onPress],
  );

  const status = getMaterialStatus(item);
  const tone = statusTone(status);
  const onPaper = stateOnPaper[tone];
  const variance = getVarianceValue(item);
  const isPending = status === 'pending';
  const isSkipped = status === 'skipped';
  const isMatch = status === 'counted_match';
  const isVariance = status === 'counted_variance';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Status mark */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isPending
            ? 'rgba(11,14,18,0.06)'
            : onPaper.chipBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isPending ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: text.onPaper.muted,
            }}
          />
        ) : isMatch ? (
          <Ionicons
            name="checkmark"
            size={18}
            color={palette.forestDeep}
          />
        ) : isVariance ? (
          <Ionicons
            name="alert"
            size={16}
            color={palette.amberDeep}
          />
        ) : (
          <Ionicons name="remove" size={18} color={palette.dangerDeep} />
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: text.onPaper.primary,
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.2,
          }}
        >
          {item.name}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
            fontVariant: ['tabular-nums'],
            letterSpacing: 0.2,
          }}
        >
          {referenceLabel} · {formatQty(item.systemQty, item.baseUnit)}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0, maxWidth: 130 }}>
        {isPending ? (
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Pendiente
          </Text>
        ) : isSkipped ? (
          <Text
            style={{
              color: palette.dangerDeep,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Saltado
          </Text>
        ) : (
          <>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                color: text.onPaper.primary,
                fontSize: 13,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                letterSpacing: -0.2,
              }}
            >
              {formatQty(item.counted ?? 0, item.baseUnit)}
            </Text>
            {isVariance ? (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: palette.amberDeep,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 0.4,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatVariance(variance, item.baseUnit)}
              </Text>
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  color: palette.forestDeep,
                  fontSize: 10,
                  fontWeight: '900',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {statusLabel(status)}
              </Text>
            )}
          </>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={15}
        color={text.onPaper.subtle}
      />
    </TouchableOpacity>
  );
}

export const VrittFaiMaterialRow = memo(Component);
