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

// ── VrittRecipeItemCard ───────────────────────────────────────────────
// Card de un renglón de receta: insumo + cantidad + merma. Reutilizado
// dentro del flow de creación de productos con receta.

export interface RecipeItemValue {
  materialId: string;
  quantity: string;
  wastePercent: string;
}

interface VrittRecipeItemCardProps {
  index: number;
  item: RecipeItemValue;
  materialOptions: PaperListOption[];
  /** Si false, oculta el botón de quitar (último renglón del form). */
  canRemove: boolean;
  onChange: (field: keyof RecipeItemValue, value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function Component({
  index,
  item,
  materialOptions,
  canRemove,
  onChange,
  onRemove,
  disabled,
}: VrittRecipeItemCardProps) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        padding: 14,
        gap: 14,
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
          Insumo {index + 1}
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
        label="Insumo"
        options={materialOptions}
        value={item.materialId}
        onChange={(v) => onChange('materialId', v)}
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <VrittPaperInput
            label="Cantidad"
            placeholder="0.25"
            value={item.quantity}
            onChangeText={(v) => onChange('quantity', v)}
            keyboardType="numeric"
            editable={!disabled}
          />
        </View>
        <View style={{ flex: 1 }}>
          <VrittPaperInput
            label="Merma %"
            placeholder="5"
            value={item.wastePercent}
            onChangeText={(v) => onChange('wastePercent', v)}
            keyboardType="numeric"
            editable={!disabled}
            suffix="%"
          />
        </View>
      </View>
    </View>
  );
}

export const VrittRecipeItemCard = memo(Component);
