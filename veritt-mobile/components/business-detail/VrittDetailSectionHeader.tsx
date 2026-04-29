import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { text } from '@/constants/design-tokens';

type VrittDetailSectionHeaderProps = {
  eyebrow: string;
  title: string;
  trailing?: string;
};

function Component({
  eyebrow,
  title,
  trailing,
}: VrittDetailSectionHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            color: text.onPaper.muted,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Text>
        {trailing ? (
          <Text
            style={{
              color: text.onPaper.subtle,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {trailing}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          color: text.onPaper.primary,
          fontSize: 22,
          fontWeight: '800',
          letterSpacing: -0.8,
          marginTop: 4,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export const VrittDetailSectionHeader = memo(Component);
