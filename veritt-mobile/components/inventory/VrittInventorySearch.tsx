import React, { memo } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  hairline,
  radius,
  surface,
  text,
} from '@/constants/design-tokens';

interface VrittInventorySearchProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

function Component({
  value,
  onChangeText,
  placeholder = 'Buscar…',
}: VrittInventorySearchProps) {
  return (
    <View
      style={{
        backgroundColor: surface.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: hairline.onPaper,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Ionicons name="search" size={15} color={text.onPaper.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={text.onPaper.subtle}
        autoCorrect={false}
        autoCapitalize="none"
        style={{
          flex: 1,
          color: text.onPaper.primary,
          fontSize: 14,
          fontWeight: '600',
          padding: 0,
        }}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: 'rgba(11,14,18,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={12} color={text.onPaper.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export const VrittInventorySearch = memo(Component);
