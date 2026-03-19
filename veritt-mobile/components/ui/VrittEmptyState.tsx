import React from 'react';
import { Text, View } from 'react-native';
import { VrittButton } from '@/components/ui/VrittButton';

type VrittEmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function VrittEmptyState({
  title,
  description,
  actionLabel,
  onActionPress,
}: VrittEmptyStateProps) {
  return (
    <View className="flex-1 justify-center gap-3">
      <Text className="text-[24px] font-bold text-veritt-text">{title}</Text>

      {description ? (
        <Text className="text-[15px] leading-[22px] text-veritt-muted md:text-base md:leading-7">
          {description}
        </Text>
      ) : null}

      {actionLabel && onActionPress ? (
        <View className="mt-3">
          <VrittButton label={actionLabel} onPress={onActionPress} />
        </View>
      ) : null}
    </View>
  );
}