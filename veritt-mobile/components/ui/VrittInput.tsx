import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

type VrittInputProps = TextInputProps & {
  label: string;
  className?: string;
  wrapperClassName?: string;
};

export function VrittInput({
  label,
  className = '',
  wrapperClassName = '',
  ...props
}: VrittInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={`rounded-veritt border bg-veritt-surface px-4 pt-[14px] pb-[10px] ${
        focused ? 'border-veritt-borderStrong' : 'border-veritt-border'
      } ${wrapperClassName}`}
    >
      <Text className="mb-2 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
        {label}
      </Text>

      <TextInput
        className={`py-1.5 text-[16px] text-veritt-text ${className}`}
        placeholderTextColor="#666666"
        selectionColor="#FFFFFF"
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}