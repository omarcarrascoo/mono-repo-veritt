import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
}

export function PrimaryButton({
  label,
  loading = false,
  disabled,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.button, isDisabled && styles.disabled]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#000000" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
  text: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});