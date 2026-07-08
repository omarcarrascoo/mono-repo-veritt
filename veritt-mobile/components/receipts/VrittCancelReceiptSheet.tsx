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

// ── VrittCancelReceiptSheet ───────────────────────────────────────────
// Sección expandible para cancelar una recepción. Reasons predefinidas
// como chips + comentario.

const PRESET_REASONS = [
  'Mercancía dañada',
  'Cantidad incorrecta',
  'Producto equivocado',
  'Error al registrar',
  'Otro motivo',
];

interface VrittCancelReceiptSheetProps {
  reason: string;
  comment: string;
  onReasonChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

function Component({
  reason,
  comment,
  onReasonChange,
  onCommentChange,
  onConfirm,
  onClose,
  isSubmitting,
}: VrittCancelReceiptSheetProps) {
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
          <Ionicons
            name="alert-circle"
            size={16}
            color={palette.dangerDeep}
          />
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
            Cancelar recepción
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
            Se revertirá todo el inventario agregado por esta recepción.
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
          contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 4 }}
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
        placeholder="Ej: caja de leche con fecha vencida"
        value={reason}
        onChangeText={onReasonChange}
        editable={!isSubmitting}
        required
      />

      <VrittPaperInput
        label="Comentario adicional"
        placeholder="Opcional"
        value={comment}
        onChangeText={onCommentChange}
        editable={!isSubmitting}
        multiline
      />

      <VrittInventoryFooterActions
        primary={{
          label: 'Confirmar cancelación',
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

export const VrittCancelReceiptSheet = memo(Component);
