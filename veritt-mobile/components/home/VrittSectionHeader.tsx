import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type VrittSectionHeaderProps = {
  eyebrow: string;
  title?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

const INK = '#0A0A0A';

function Component({
  eyebrow,
  title,
  actionLabel,
  onActionPress,
}: VrittSectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 4,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text
          style={{
            color: 'rgba(10,10,10,0.45)',
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        {title ? (
          <Text
            style={{
              color: INK,
              fontSize: 20,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginTop: 3,
            }}
          >
            {title}
          </Text>
        ) : null}
      </View>

      {actionLabel && onActionPress ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onActionPress}>
          <Text
            style={{
              color: INK,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {actionLabel} →
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export const VrittSectionHeader = memo(Component);
