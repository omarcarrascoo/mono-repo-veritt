import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

type VrittTextButtonProps = TouchableOpacityProps & {
  label: string;
  className?: string;
  textClassName?: string;
};

export function VrittTextButton({
  label,
  className = '',
  textClassName = '',
  ...props
}: VrittTextButtonProps) {
  return (
    <TouchableOpacity className={className} activeOpacity={0.8} {...props}>
      <Text className={`text-[14px] text-veritt-muted ${textClassName}`}>{label}</Text>
    </TouchableOpacity>
  );
}