import React, { memo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';
import { VrittPaperInput } from '@/components/inventory/VrittPaperInput';
import { VrittInventoryFooterActions } from '@/components/inventory/VrittInventoryFooterActions';

// ── VrittRejectReceiptSheet ───────────────────────────────────────────
// Candado C3: un gerente rechaza un borrador (PENDING_REVIEW). A diferencia
// de cancelar, aquí NO se mueve inventario (el borrador nunca lo tocó), sólo
// se marca REJECTED con un motivo. Mismo lenguaje visual que el de cancelar.

const PRESET_REASONS = [
  'Cantidad no coincide',
  'Costo incorrecto',
  'Material equivocado',
  'Falta documentación',
  'Otro motivo',
];

interface VrittRejectReceiptSheetProps {
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

function Component({
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  isSubmitting,
}: VrittRejectReceiptSheetProps) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: withAlpha(palette.danger, 0.2),
        padding: 22,
        gap: 18,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: withAlpha(palette.danger, 0.14),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close-circle" size={16} color={palette.dangerDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: palette.dangerDeep,
              fontSize: 14,
              fontWeight: '900',
              letterSpacing: -0.3,
            }}
          >
            Rechazar recepción
          </Text>
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 11,
              fontWeight: '700',
              marginTop: 2,
              lineHeight: 15,
            }}
          >
            No entrará stock al inventario. Quien la registró deberá corregirla.
          </Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            paddingHorizontal: 4,
          }}
        >
          Motivo
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingVertical: 2,
            paddingHorizontal: 4,
          }}
        >
          {PRESET_REASONS.map((preset) => {
            const isSelected = reason === preset;
            return (
              <TouchableOpacity
                key={preset}
                activeOpacity={0.88}
                onPress={() => onReasonChange(preset)}
                disabled={isSubmitting}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  backgroundColor: isSelected
                    ? withAlpha(palette.danger, 0.16)
                    : surface.card,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? withAlpha(palette.danger, 0.4)
                    : hairline.onPaper,
                }}
              >
                <Text
                  style={{
                    color: isSelected
                      ? palette.dangerDeep
                      : text.onPaper.primary,
                    fontSize: 12,
                    fontWeight: '800',
                    letterSpacing: -0.1,
                  }}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <VrittPaperInput
        label="Detalle del motivo"
        placeholder="Ej: la orden pedía 10 cajas y llegaron 8"
        value={reason}
        onChangeText={onReasonChange}
        editable={!isSubmitting}
        required
      />

      <VrittInventoryFooterActions
        primary={{
          label: 'Confirmar rechazo',
          icon: 'close-circle-outline',
          onPress: onConfirm,
          loading: isSubmitting,
          disabled: !reason.trim(),
        }}
        secondary={{
          label: 'Volver',
          onPress: onClose,
          disabled: isSubmitting,
        }}
      />
    </View>
  );
}

export const VrittRejectReceiptSheet = memo(Component);
