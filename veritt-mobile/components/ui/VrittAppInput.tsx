import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface AppInputProps extends TextInputProps {
  label: string;
}

export function AppInput({ label, ...props }: AppInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, focused && styles.wrapperFocused]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
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

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: '#1D1D1D',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  wrapperFocused: {
    borderColor: '#3A3A3A',
  },
  label: {
    color: '#6A6A6A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 6,
  },
});