import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export function VrittLoader() {
  return (
    <View className="flex-1 items-center justify-center bg-veritt-bg">
      <ActivityIndicator color="#FFFFFF" />
    </View>
  );
}