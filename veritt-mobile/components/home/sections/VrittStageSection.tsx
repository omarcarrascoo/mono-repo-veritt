import React, { memo } from 'react';
import { View } from 'react-native';

import type { DailyChainMoment } from '@/lib/daily-chain-home';
import type { SemaphoreStepInfo } from '@/lib/daily-chain-home';
import { VrittStageMega } from '@/components/home/VrittStageMega';
import { VrittChainSemaphore } from '@/components/home/VrittChainSemaphore';

type VrittStageSectionProps = {
  moment: DailyChainMoment;
  stepNumber: number;
  dateLabel: string;
  semaphoreSteps: SemaphoreStepInfo[];
  isLoading: boolean;
  onPressCta: () => void;
  onPressChainDetail: () => void;
};

function PlaceholderBlock() {
  return (
    <View
      style={{
        height: 420,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(10,10,10,0.06)',
      }}
    />
  );
}

function Component({
  moment,
  stepNumber,
  dateLabel,
  semaphoreSteps,
  isLoading,
  onPressCta,
  onPressChainDetail,
}: VrittStageSectionProps) {
  if (isLoading) {
    return <PlaceholderBlock />;
  }

  return (
    <>
      <VrittStageMega
        moment={moment}
        stepNumber={stepNumber}
        dateLabel={dateLabel}
        onPressCta={onPressCta}
        onPressDetail={onPressChainDetail}
      />
      <VrittChainSemaphore
        steps={semaphoreSteps}
        onPress={onPressChainDetail}
      />
    </>
  );
}

export const VrittStageSection = memo(Component);
