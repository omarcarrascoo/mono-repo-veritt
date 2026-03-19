import React from 'react';
import { Text } from 'react-native';

type VrittSectionLabelProps = {
  children: React.ReactNode;
  className?: string;
};

export function VrittSectionLabel({
  children,
  className = '',
}: VrittSectionLabelProps) {
  return (
    <Text className={`text-[11px] font-bold uppercase tracking-[1.2px] text-veritt-mutedSoft ${className}`}>
      {children}
    </Text>
  );
}