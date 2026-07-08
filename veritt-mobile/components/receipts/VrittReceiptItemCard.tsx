import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';
import {
  VrittPaperInput,
  VrittPaperListPicker,
  type PaperListOption,
} from '@/components/inventory/VrittPaperInput';
import { formatInventoryCurrency } from '@/lib/inventory-formatters';

// ── VrittReceiptItemCard ─────────────────────────────────────────────
// Card de un renglón en el flow de crear recepción.

export interface ReceiptItemValue {
  materialId: string;
  quantityReceived: string;
  actualUnitCost: string;
}

interface VrittReceiptItemCardProps {
  index: number;
  item: ReceiptItemValue;
  materialOptions: PaperListOption[];
  /** Si false, oculta el botón "Quitar". */
  canRemove: boolean;
  onChange: (field: keyof ReceiptItemValue, value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  currency: string;
  /** Símbolo / unidad base del material seleccionado, para mostrar como sufijo. */
  baseUnitSuffix?: string;
}

function Component({
  index,
  item,
  materialOptions,
  canRemove,
  onChange,
  onRemove,
  disabled,
  currency,
  baseUnitSuffix,
}: VrittReceiptItemCardProps) {
  const lineTotal =
    Number(item.quantityReceived || 0) * Number(item.actualUnitCost || 0);

  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 22,
        gap: 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(11,14,18,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: -0.2,
            }}
          >
            {index + 1}
          </Text>
        </View>
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          Artículo {index + 1}
        </Text>
        {canRemove ? (
          <TouchableOpacity
            onPress={onRemove}
            disabled={disabled}
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(194,84,80,0.1)',
            }}
          >
            <Ionicons
              name="trash-outline"
              size={12}
              color={palette.dangerDeep}
            />
            <Text
              style={{
                color: palette.dangerDeep,
                fontSize: 10,
                fontWeight: '900',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Quitar
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <VrittPaperListPicker
        label="Material"
        options={materialOptions}
        value={item.materialId}
        onChange={(v) => onChange('materialId', v)}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <VrittPaperInput
            label="Cantidad"
            placeholder="0"
            value={item.quantityReceived}
            onChangeText={(v) => onChange('quantityReceived', v)}
            keyboardType="decimal-pad"
            editable={!disabled}
            suffix={baseUnitSuffix}
          />
        </View>
        <View style={{ flex: 1 }}>
          <VrittPaperInput
            label={`Costo (${currency})`}
            placeholder="0.00"
            value={item.actualUnitCost}
            onChangeText={(v) => onChange('actualUnitCost', v)}
            keyboardType="decimal-pad"
            editable={!disabled}
          />
        </View>
      </View>

      {lineTotal > 0 ? (
        <View
          style={{
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: hairline.onPaperSoft,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 10,
              fontWeight: '900',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Subtotal
          </Text>
          <Text
            style={{
              color: text.onPaper.primary,
              fontSize: 15,
              fontWeight: '900',
              letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatInventoryCurrency(lineTotal, currency)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const VrittReceiptItemCard = memo(Component);
