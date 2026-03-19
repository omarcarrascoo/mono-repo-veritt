import React from 'react';
import { View, ViewProps } from 'react-native';

type VrittCardProps = ViewProps & {
  children: React.ReactNode;
  className?: string;
};

export function VrittCard({
  children,
  className = '',
  ...props
}: VrittCardProps) {
  return (
    <View
      className={`rounded-card border border-veritt-border bg-veritt-surface p-5 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}