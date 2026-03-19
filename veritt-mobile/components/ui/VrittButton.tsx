import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

type VrittButtonVariant = 'primary' | 'secondary';

type VrittButtonProps = TouchableOpacityProps & {
  label: string;
  loading?: boolean;
  variant?: VrittButtonVariant;
  className?: string;
};

export function VrittButton({
  label,
  loading = false,
  disabled,
  variant = 'primary',
  className = '',
  ...props
}: VrittButtonProps) {
  const isDisabled = disabled || loading;

  const baseClass =
    variant === 'primary'
      ? 'bg-white'
      : 'border border-veritt-border bg-veritt-surface';

  const textClass =
    variant === 'primary'
      ? 'text-black'
      : 'text-veritt-text';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={isDisabled}
      className={`h-[58px] items-center justify-center rounded-veritt ${baseClass} ${
        isDisabled ? 'opacity-70' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000000' : '#FFFFFF'} />
      ) : (
        <Text className={`text-[16px] font-extrabold ${textClass}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}