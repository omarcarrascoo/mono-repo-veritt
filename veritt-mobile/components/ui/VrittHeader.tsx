import React from 'react';
import { Text, View } from 'react-native';

type VrittHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
};

export function VrittHeader({
  eyebrow = 'VERITT',
  title,
  subtitle,
  centered = false,
}: VrittHeaderProps) {
  return (
    <View className={`gap-2.5 ${centered ? 'items-center' : ''}`}>
      <Text
        className={`text-[12px] font-bold uppercase tracking-eyebrow text-veritt-mutedStrong ${
          centered ? 'text-center' : ''
        }`}
      >
        {eyebrow}
      </Text>

      <Text
        className={`text-[34px] font-extrabold leading-[38px] tracking-[-1.2px] text-veritt-text md:text-5xl md:leading-[54px] ${
          centered ? 'text-center' : ''
        }`}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          className={`text-[15px] leading-[22px] text-veritt-muted md:text-base md:leading-7 ${
            centered ? 'text-center max-w-2xl' : 'max-w-[92%]'
          }`}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}