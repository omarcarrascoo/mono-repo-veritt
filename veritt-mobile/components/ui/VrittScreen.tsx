import React from 'react';
import { ScrollView, View, ViewProps, ScrollViewProps } from 'react-native';

type VrittScreenProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentClassName?: string;
  className?: string;
} & ViewProps &
  ScrollViewProps;

export function VrittScreen({
  children,
  scrollable = false,
  contentClassName = '',
  className = '',
  ...props
}: VrittScreenProps) {
  if (scrollable) {
    return (
      <ScrollView
        className={`flex-1 bg-veritt-bg ${className}`}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        {...props}
      >
        <View className={`w-full px-6 pt-[88px] pb-8 md:items-center ${contentClassName}`}>
          <View className="w-full md:max-w-3xl">{children}</View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className={`flex-1 bg-veritt-bg px-6 pt-[88px] pb-8 md:items-center ${className}`} {...props}>
      <View className={`w-full md:max-w-3xl flex-1 ${contentClassName}`}>{children}</View>
    </View>
  );
}