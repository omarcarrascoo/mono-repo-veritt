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

// ── VrittCategoryPicker ───────────────────────────────────────────────
// Picker de categoría con tres modos: "Sin categoría", existentes, o
// crear nueva (input inline). State controlado afuera.

const CUSTOM_VALUE = '__CUSTOM__';

interface VrittCategoryPickerProps {
  label?: string;
  existingCategories: string[];
  selected: string;
  onSelect: (value: string) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  disabled?: boolean;
}

function Component({
  label = 'Categoría',
  existingCategories,
  selected,
  onSelect,
  customValue,
  onCustomChange,
  disabled,
}: VrittCategoryPickerProps) {
  const isCustom = selected === CUSTOM_VALUE;

  return (
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
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 4 }}
      >
        <CategoryChip
          label="Sin categoría"
          icon="ellipse-outline"
          isSelected={selected === ''}
          onPress={() => onSelect('')}
          disabled={disabled}
        />
        {existingCategories.map((c) => (
          <CategoryChip
            key={c}
            label={c}
            icon="pricetag-outline"
            isSelected={selected === c}
            onPress={() => onSelect(c)}
            disabled={disabled}
          />
        ))}
        <CategoryChip
          label="Nueva…"
          icon="add"
          isSelected={isCustom}
          onPress={() => onSelect(CUSTOM_VALUE)}
          disabled={disabled}
        />
      </ScrollView>

      {isCustom ? (
        <VrittPaperInput
          label="Nombre de la categoría"
          placeholder="Ej: Bebidas frías"
          value={customValue}
          onChangeText={onCustomChange}
          editable={!disabled}
        />
      ) : null}
    </View>
  );
}

function CategoryChip({
  label,
  icon,
  isSelected,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: radius.pill,
        backgroundColor: isSelected ? surface.ink : surface.card,
        borderWidth: 1,
        borderColor: isSelected
          ? withAlpha(palette.ink, 0.85)
          : hairline.onPaper,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons
        name={icon}
        size={12}
        color={isSelected ? text.onInk.primary : text.onPaper.primary}
      />
      <Text
        style={{
          color: isSelected ? text.onInk.primary : text.onPaper.primary,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export const VrittCategoryPicker = memo(Component);
export const CATEGORY_CUSTOM_VALUE = CUSTOM_VALUE;
