import React, { memo } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  palette,
  radius,
  surface,
  text,
  withAlpha,
} from '@/constants/design-tokens';

// ── VrittPaperInput ──────────────────────────────────────────────────
// Input con estilo paper (consistente con sales/fai/shifts). Reemplaza
// VrittInput dark dentro del módulo inventario.

interface VrittPaperInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  /** Sufijo opcional (e.g. "kg", "MXN") rendereado dentro del input. */
  suffix?: string;
  /** Marca el input como obligatorio. */
  required?: boolean;
  multiline?: boolean;
}

function Component({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboardType,
  autoCapitalize,
  editable = true,
  suffix,
  required,
  multiline,
}: VrittPaperInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        {required ? (
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: palette.danger,
            }}
          />
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: surface.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: hairline.onPaper,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 13,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          opacity: editable ? 1 : 0.55,
          minHeight: multiline ? 80 : undefined,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={text.onPaper.subtle}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          style={{
            flex: 1,
            color: text.onPaper.primary,
            fontSize: 15,
            fontWeight: '600',
            letterSpacing: -0.2,
            padding: 0,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {suffix ? (
          <Text
            style={{
              color: text.onPaper.muted,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
      {hint ? (
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 11,
            fontWeight: '600',
            paddingHorizontal: 4,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export const VrittPaperInput = memo(Component);

// ── VrittPaperOptionPicker ───────────────────────────────────────────
// Picker tipo chips horizontales. Para tipo de ubicación, tipo de producto.

export interface PaperOption<T extends string = string> {
  label: string;
  value: T;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
}

interface VrittPaperOptionPickerProps<T extends string = string> {
  label: string;
  options: PaperOption<T>[];
  value: T;
  onChange: (value: T) => void;
  required?: boolean;
}

function PickerComponent<T extends string = string>({
  label,
  options,
  value,
  onChange,
  required,
}: VrittPaperOptionPickerProps<T>) {
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        {required ? (
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: palette.danger,
            }}
          />
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 4 }}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={0.88}
              onPress={() => onChange(opt.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: radius.pill,
                backgroundColor: isSelected ? surface.ink : surface.card,
                borderWidth: 1,
                borderColor: isSelected
                  ? withAlpha(palette.ink, 0.85)
                  : hairline.onPaper,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {opt.icon ? (
                <Ionicons
                  name={opt.icon}
                  size={13}
                  color={
                    isSelected ? text.onInk.primary : text.onPaper.primary
                  }
                />
              ) : null}
              <Text
                style={{
                  color: isSelected
                    ? text.onInk.primary
                    : text.onPaper.primary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: -0.1,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const VrittPaperOptionPicker = memo(PickerComponent) as <
  T extends string = string,
>(
  props: VrittPaperOptionPickerProps<T>,
) => React.ReactElement;

// ── VrittPaperListPicker ─────────────────────────────────────────────
// Picker tipo lista de cards (vertical) — para listas más largas como
// ubicaciones o categorías existentes.

export interface PaperListOption<T extends string = string> {
  label: string;
  value: T;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface VrittPaperListPickerProps<T extends string = string> {
  label: string;
  options: PaperListOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function ListComponent<T extends string = string>({
  label,
  options,
  value,
  onChange,
}: VrittPaperListPickerProps<T>) {
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
      <View style={{ gap: 8 }}>
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={{
                backgroundColor: surface.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: isSelected
                  ? withAlpha(palette.ink, 0.85)
                  : hairline.onPaper,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {opt.icon ? (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isSelected
                      ? surface.ink
                      : 'rgba(11,14,18,0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={
                      isSelected ? text.onInk.primary : text.onPaper.primary
                    }
                  />
                </View>
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: text.onPaper.primary,
                    fontSize: 13,
                    fontWeight: '800',
                    letterSpacing: -0.2,
                  }}
                >
                  {opt.label}
                </Text>
                {opt.hint ? (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: text.onPaper.muted,
                      fontSize: 11,
                      fontWeight: '600',
                      marginTop: 2,
                    }}
                  >
                    {opt.hint}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: isSelected
                    ? surface.ink
                    : 'rgba(11,14,18,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected ? (
                  <Ionicons name="checkmark" size={13} color={palette.paper} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const VrittPaperListPicker = memo(ListComponent) as <
  T extends string = string,
>(
  props: VrittPaperListPickerProps<T>,
) => React.ReactElement;
