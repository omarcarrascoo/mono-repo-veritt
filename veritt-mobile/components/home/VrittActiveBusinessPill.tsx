import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type VrittActiveBusinessPillProps = {
  businessName: string;
  roleLabel: string;
  canSwitch: boolean;
  onPress: () => void;
};

const INK = '#0B0E12';

function Component({
  businessName,
  roleLabel,
  canSwitch,
  onPress,
}: VrittActiveBusinessPillProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!canSwitch}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(10,10,10,0.08)',
        alignSelf: 'flex-start',
        marginLeft: 4,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          backgroundColor: INK,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#F5F2EA',
            fontSize: 10,
            fontWeight: '900',
          }}
        >
          {businessName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text
        style={{
          color: INK,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: -0.2,
        }}
      >
        {businessName}
      </Text>
      <Text
        style={{
          color: 'rgba(10,10,10,0.45)',
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        · {roleLabel}
      </Text>
      {canSwitch ? (
        <Ionicons
          name="swap-horizontal"
          size={14}
          color="rgba(10,10,10,0.45)"
        />
      ) : null}
    </TouchableOpacity>
  );
}

export const VrittActiveBusinessPill = memo(Component);
