import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type VrittGreetingHeaderProps = {
  greeting: string;
  firstName: string;
  onPressAvatar: () => void;
};

const INK = '#0A0A0A';

function Component({
  greeting,
  firstName,
  onPressAvatar,
}: VrittGreetingHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text
          style={{
            color: 'rgba(10,10,10,0.48)',
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 2.2,
            textTransform: 'uppercase',
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            color: INK,
            fontSize: 30,
            fontWeight: '900',
            letterSpacing: -1.2,
            marginTop: 4,
            lineHeight: 34,
          }}
        >
          {firstName}.
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressAvatar}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: INK,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#F5F2EA',
            fontSize: 14,
            fontWeight: '900',
          }}
        >
          {firstName.charAt(0).toUpperCase()}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export const VrittGreetingHeader = memo(Component);
