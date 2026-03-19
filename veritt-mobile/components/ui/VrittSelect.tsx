import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type VrittSelectOption<T extends string = string> = {
  label: string;
  value: T;
  hint?: string;
};

type VrittSelectProps<T extends string = string> = {
  label: string;
  placeholder?: string;
  value: T;
  options: VrittSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function VrittSelect<T extends string = string>({
  label,
  placeholder = 'Selecciona una opción',
  value,
  options,
  onChange,
  disabled = false,
}: VrittSelectProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`rounded-veritt border border-veritt-border bg-veritt-surface px-4 pt-[14px] pb-[12px] ${
          disabled ? 'opacity-70' : ''
        }`}
      >
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
          {label}
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[16px] text-veritt-text">
              {selectedOption?.label ?? placeholder}
            </Text>

            {selectedOption?.hint ? (
              <Text className="mt-1 text-[12px] text-veritt-muted">
                {selectedOption.hint}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-down" size={18} color="#8C8C8C" />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[78%] rounded-t-[28px] border-t border-veritt-border bg-veritt-surface px-5 pt-5 pb-8">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-veritt-text">{label}</Text>

              <Pressable onPress={() => setOpen(false)} className="h-9 w-9 items-center justify-center rounded-full bg-veritt-surfaceSoft">
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-2">
                {options.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.9}
                      onPress={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`rounded-[18px] border px-4 py-4 ${
                        isSelected
                          ? 'border-veritt-borderStrong bg-[#151515]'
                          : 'border-veritt-border bg-veritt-surfaceSoft'
                      }`}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text
                            className={`text-[15px] font-semibold ${
                              isSelected ? 'text-veritt-text' : 'text-veritt-text'
                            }`}
                          >
                            {option.label}
                          </Text>

                          {option.hint ? (
                            <Text className="mt-1 text-[12px] text-veritt-muted">
                              {option.hint}
                            </Text>
                          ) : null}
                        </View>

                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        ) : (
                          <Ionicons name="ellipse-outline" size={20} color="#555555" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}